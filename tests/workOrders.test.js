'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../src/db');

let app;

beforeEach(() => {
  app = createApp(createDb(':memory:'));
});

describe('POST /work-orders', () => {
  const validBody = { order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 500 };

  describe('happy path', () => {
    it('creates a work order and returns 201 with the stored row', async () => {
      const res = await request(app).post('/work-orders').send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        order_no: 'WO-2026-0001',
        style_code: 'ST-100',
        qty: 500,
        status: 'PENDING',
      });
      expect(typeof res.body.id).toBe('number');
      expect(res.body.created_at).toBeTruthy();
      expect(res.body.updated_at).toBeTruthy();
    });
  });

  describe('invalid order_no format → 400', () => {
    it.each(['WO-1', 'BADCODE', 'WO-2026-001', 'wo-2026-0001', 'WO-2026-00011', ''])(
      'rejects order_no %p',
      async (order_no) => {
        const res = await request(app)
          .post('/work-orders')
          .send({ ...validBody, order_no });

        expect(res.status).toBe(400);
        expect(typeof res.body.error).toBe('string');
        expect(res.body.error).toMatch(/order_no/);
      }
    );
  });

  describe('missing required fields → 400', () => {
    it('rejects a missing order_no', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ style_code: 'ST-100', qty: 500 });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/order_no/);
    });

    it('rejects a missing style_code', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ order_no: 'WO-2026-0001', qty: 500 });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/style_code/);
    });

    it('rejects a missing qty', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ order_no: 'WO-2026-0001', style_code: 'ST-100' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/qty/);
    });

    it('rejects an empty body', async () => {
      const res = await request(app).post('/work-orders').send({});

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });

    it('rejects a null body', async () => {
      // validateCreateWorkOrder guards `!body || typeof body !== 'object'`.
      const res = await request(app).post('/work-orders').send(null);

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('style_code length → 400', () => {
    it('rejects a style_code longer than 20 chars', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ ...validBody, style_code: 'X'.repeat(21) });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/style_code/);
    });

    it('accepts a style_code of exactly 20 chars', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ ...validBody, style_code: 'X'.repeat(20) });

      expect(res.status).toBe(201);
      expect(res.body.style_code).toBe('X'.repeat(20));
    });

    it('rejects an empty style_code', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ ...validBody, style_code: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/style_code/);
    });
  });

  describe('qty out of range → 400', () => {
    it.each([0, 100001, -1, -500])('rejects qty %p', async (qty) => {
      const res = await request(app)
        .post('/work-orders')
        .send({ ...validBody, qty });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/qty/);
    });

    it('accepts qty at the lower bound (1)', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ ...validBody, qty: 1 });
      expect(res.status).toBe(201);
      expect(res.body.qty).toBe(1);
    });

    it('accepts qty at the upper bound (100000)', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ ...validBody, qty: 100000 });
      expect(res.status).toBe(201);
      expect(res.body.qty).toBe(100000);
    });
  });

  describe('qty type → 400', () => {
    it('rejects a non-integer qty (1.5)', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ ...validBody, qty: 1.5 });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/qty/);
    });

    it('rejects a numeric string qty ("500")', async () => {
      const res = await request(app)
        .post('/work-orders')
        .send({ ...validBody, qty: '500' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/qty/);
    });
  });

  describe('duplicate order_no → 409', () => {
    it('rejects a second insert with the same order_no', async () => {
      const first = await request(app).post('/work-orders').send(validBody);
      expect(first.status).toBe(201);

      const second = await request(app).post('/work-orders').send(validBody);
      expect(second.status).toBe(409);
      expect(typeof second.body.error).toBe('string');
      expect(second.body.error).toMatch(/order_no/);
    });
  });
});

describe('GET /work-orders', () => {
  // Helper: create a work order via POST and return the created row.
  async function createOrder(overrides = {}) {
    const body = { order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 500, ...overrides };
    const res = await request(app).post('/work-orders').send(body);
    expect(res.status).toBe(201);
    return res.body;
  }

  describe('empty database', () => {
    it('returns 200 with an empty array', async () => {
      const res = await request(app).get('/work-orders');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([]);
    });
  });

  describe('listing all work orders', () => {
    it('returns all created work orders as an array, ordered by id ascending', async () => {
      await createOrder({ order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 100 });
      await createOrder({ order_no: 'WO-2026-0002', style_code: 'ST-200', qty: 200 });
      await createOrder({ order_no: 'WO-2026-0003', style_code: 'ST-300', qty: 300 });

      const res = await request(app).get('/work-orders');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);

      const ids = res.body.map((row) => row.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
      expect(res.body.map((row) => row.order_no)).toEqual([
        'WO-2026-0001',
        'WO-2026-0002',
        'WO-2026-0003',
      ]);
    });

    it('returns rows with the full work order shape', async () => {
      await createOrder({ order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 500 });

      const res = await request(app).get('/work-orders');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);

      const row = res.body[0];
      expect(typeof row.id).toBe('number');
      expect(row.order_no).toBe('WO-2026-0001');
      expect(row.style_code).toBe('ST-100');
      expect(row.qty).toBe(500);
      expect(row.status).toBe('PENDING');
      expect(row.created_at).toBeTruthy();
      expect(row.updated_at).toBeTruthy();
      expect(Object.keys(row).sort()).toEqual(
        ['id', 'order_no', 'style_code', 'qty', 'status', 'created_at', 'updated_at'].sort()
      );
    });
  });

  describe('filtering by status', () => {
    it('returns all PENDING rows when filtering by status=PENDING', async () => {
      await createOrder({ order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 100 });
      await createOrder({ order_no: 'WO-2026-0002', style_code: 'ST-200', qty: 200 });

      const res = await request(app).get('/work-orders').query({ status: 'PENDING' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((row) => row.status === 'PENDING')).toBe(true);
      expect(res.body.map((row) => row.order_no)).toEqual(['WO-2026-0001', 'WO-2026-0002']);
    });

    it('returns an empty array for a valid status with no matching rows', async () => {
      // Newly created orders are all PENDING, so IN_PROGRESS/COMPLETED have no matches yet.
      await createOrder({ order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 100 });
      await createOrder({ order_no: 'WO-2026-0002', style_code: 'ST-200', qty: 200 });

      const inProgress = await request(app).get('/work-orders').query({ status: 'IN_PROGRESS' });
      expect(inProgress.status).toBe(200);
      expect(inProgress.body).toEqual([]);

      const completed = await request(app).get('/work-orders').query({ status: 'COMPLETED' });
      expect(completed.status).toBe(200);
      expect(completed.body).toEqual([]);
    });

    it('returns only the matching subset and is ordered by id ascending', async () => {
      await createOrder({ order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 100 });
      await createOrder({ order_no: 'WO-2026-0002', style_code: 'ST-200', qty: 200 });
      await createOrder({ order_no: 'WO-2026-0003', style_code: 'ST-300', qty: 300 });

      const res = await request(app).get('/work-orders').query({ status: 'PENDING' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      const ids = res.body.map((row) => row.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    });
  });

  describe('invalid status query value → 400', () => {
    it.each(['BOGUS', 'pending', 'in_progress', 'Completed', ''])(
      'rejects status=%p with 400 and an error body',
      async (status) => {
        const res = await request(app).get('/work-orders').query({ status });

        expect(res.status).toBe(400);
        expect(typeof res.body.error).toBe('string');
        expect(res.body.error).toMatch(/status/);
      }
    );
  });

  describe('positive-match filtering across all statuses', () => {
    // Helper: advance an order one legal step via PATCH and assert success.
    async function patchStatus(id, status) {
      const res = await request(app).patch(`/work-orders/${id}/status`).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
      return res.body;
    }

    // Build a mixed-status world once per test:
    //   #1 stays PENDING
    //   #2 PENDING → IN_PROGRESS
    //   #3 PENDING → IN_PROGRESS
    //   #4 PENDING → IN_PROGRESS → COMPLETED
    //   #5 stays PENDING
    async function seedMixedStatuses() {
      const o1 = await createOrder({ order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 100 });
      const o2 = await createOrder({ order_no: 'WO-2026-0002', style_code: 'ST-200', qty: 200 });
      const o3 = await createOrder({ order_no: 'WO-2026-0003', style_code: 'ST-300', qty: 300 });
      const o4 = await createOrder({ order_no: 'WO-2026-0004', style_code: 'ST-400', qty: 400 });
      const o5 = await createOrder({ order_no: 'WO-2026-0005', style_code: 'ST-500', qty: 500 });

      await patchStatus(o2.id, 'IN_PROGRESS');
      await patchStatus(o3.id, 'IN_PROGRESS');
      await patchStatus(o4.id, 'IN_PROGRESS');
      await patchStatus(o4.id, 'COMPLETED');

      return { o1, o2, o3, o4, o5 };
    }

    it('returns exactly the IN_PROGRESS rows, ordered by id ascending', async () => {
      const { o2, o3 } = await seedMixedStatuses();

      const res = await request(app).get('/work-orders').query({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.map((row) => row.id)).toEqual([o2.id, o3.id]);
      expect(res.body.every((row) => row.status === 'IN_PROGRESS')).toBe(true);
    });

    it('returns exactly the COMPLETED rows, ordered by id ascending', async () => {
      const { o4 } = await seedMixedStatuses();

      const res = await request(app).get('/work-orders').query({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.map((row) => row.id)).toEqual([o4.id]);
      expect(res.body.every((row) => row.status === 'COMPLETED')).toBe(true);
    });

    it('returns exactly the still-PENDING rows, ordered by id ascending', async () => {
      const { o1, o5 } = await seedMixedStatuses();

      const res = await request(app).get('/work-orders').query({ status: 'PENDING' });

      expect(res.status).toBe(200);
      expect(res.body.map((row) => row.id)).toEqual([o1.id, o5.id]);
      expect(res.body.every((row) => row.status === 'PENDING')).toBe(true);
    });

    it('partitions the full set: PENDING + IN_PROGRESS + COMPLETED == all rows', async () => {
      await seedMixedStatuses();

      const all = await request(app).get('/work-orders');
      const pending = await request(app).get('/work-orders').query({ status: 'PENDING' });
      const inProgress = await request(app).get('/work-orders').query({ status: 'IN_PROGRESS' });
      const completed = await request(app).get('/work-orders').query({ status: 'COMPLETED' });

      expect(all.body).toHaveLength(5);
      expect(pending.body).toHaveLength(2);
      expect(inProgress.body).toHaveLength(2);
      expect(completed.body).toHaveLength(1);

      const filteredIds = [...pending.body, ...inProgress.body, ...completed.body]
        .map((row) => row.id)
        .sort((a, b) => a - b);
      expect(filteredIds).toEqual(all.body.map((row) => row.id));
    });
  });
});

describe('PATCH /work-orders/:id/status', () => {
  // Helper: create a work order via POST (always starts PENDING) and return the created row.
  async function createOrder(overrides = {}) {
    const body = { order_no: 'WO-2026-0001', style_code: 'ST-100', qty: 500, ...overrides };
    const res = await request(app).post('/work-orders').send(body);
    expect(res.status).toBe(201);
    return res.body;
  }

  // Helper: advance an order's status one legal step and assert success.
  async function patchStatus(id, status) {
    const res = await request(app).patch(`/work-orders/${id}/status`).send({ status });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(status);
    return res.body;
  }

  describe('valid transitions', () => {
    it('advances PENDING → IN_PROGRESS → COMPLETED, returning 200 each step', async () => {
      const created = await createOrder();
      expect(created.status).toBe('PENDING');

      const inProgress = await patchStatus(created.id, 'IN_PROGRESS');
      expect(inProgress.id).toBe(created.id);
      expect(inProgress.status).toBe('IN_PROGRESS');

      const completed = await patchStatus(created.id, 'COMPLETED');
      expect(completed.id).toBe(created.id);
      expect(completed.status).toBe('COMPLETED');
    });

    it('returns the full updated row shape on a valid transition', async () => {
      const created = await createOrder();

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: created.id,
        order_no: 'WO-2026-0001',
        style_code: 'ST-100',
        qty: 500,
        status: 'IN_PROGRESS',
      });
      expect(res.body.created_at).toBeTruthy();
      expect(res.body.updated_at).toBeTruthy();
      expect(Object.keys(res.body).sort()).toEqual(
        ['id', 'order_no', 'style_code', 'qty', 'status', 'created_at', 'updated_at'].sort()
      );
    });

    it('sets updated_at on a successful PATCH (>= created_at)', async () => {
      const created = await createOrder();

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.updated_at).toBeTruthy();
      // Timestamps may be equal at ms resolution; updated_at must not predate created_at.
      expect(res.body.updated_at >= created.created_at).toBe(true);
    });
  });

  describe('illegal transitions → 400', () => {
    it('rejects PENDING → COMPLETED (skipping IN_PROGRESS)', async () => {
      const created = await createOrder();

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });

    it('rejects PENDING → PENDING (no-op, not in the transition map)', async () => {
      const created = await createOrder();

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'PENDING' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });

    it('rejects IN_PROGRESS → PENDING (backward)', async () => {
      const created = await createOrder();
      await patchStatus(created.id, 'IN_PROGRESS');

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'PENDING' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });

    it('rejects any transition out of COMPLETED (COMPLETED → IN_PROGRESS)', async () => {
      const created = await createOrder();
      await patchStatus(created.id, 'IN_PROGRESS');
      await patchStatus(created.id, 'COMPLETED');

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });

    it('rejects COMPLETED → COMPLETED (no-op out of terminal state)', async () => {
      const created = await createOrder();
      await patchStatus(created.id, 'IN_PROGRESS');
      await patchStatus(created.id, 'COMPLETED');

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('bad status value → 400', () => {
    it('rejects an unknown status value (BOGUS)', async () => {
      const created = await createOrder();

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'BOGUS' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/status/);
    });

    it('rejects a lowercase status value (pending)', async () => {
      const created = await createOrder();

      const res = await request(app)
        .patch(`/work-orders/${created.id}/status`)
        .send({ status: 'pending' });

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/status/);
    });

    it('rejects a missing status field', async () => {
      const created = await createOrder();

      const res = await request(app).patch(`/work-orders/${created.id}/status`).send({});

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/status/);
    });

    it('rejects an empty body', async () => {
      const created = await createOrder();

      const res = await request(app).patch(`/work-orders/${created.id}/status`).send();

      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error).toMatch(/status/);
    });
  });

  describe('unknown id → 404', () => {
    it('returns 404 for a numeric id that does not exist', async () => {
      const res = await request(app)
        .patch('/work-orders/999999/status')
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(404);
      expect(typeof res.body.error).toBe('string');
    });

    it('returns 404 for a non-numeric id', async () => {
      const res = await request(app)
        .patch('/work-orders/abc/status')
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(404);
      expect(typeof res.body.error).toBe('string');
    });

    it.each(['0x1', '1e3', '-1', '+1', '1.0', ' 1'])(
      'returns 404 for coercible-but-non-plain-digit id %p (never resolves to an unrelated row)',
      async (id) => {
        // A real row #1 exists; these forms must NOT be coerced into matching it.
        const created = await createOrder();
        expect(created.id).toBe(1);

        const res = await request(app)
          .patch(`/work-orders/${id}/status`)
          .send({ status: 'IN_PROGRESS' });

        expect(res.status).toBe(404);
        expect(typeof res.body.error).toBe('string');

        // The real row #1 must remain untouched (still PENDING).
        const check = await request(app).get('/work-orders').query({ status: 'PENDING' });
        expect(check.body.map((row) => row.id)).toContain(1);
      }
    );
  });
});

describe('error handling', () => {
  // The last-resort error middleware in createApp must keep the JSON error-shape
  // contract (status 500, { error: 'internal server error' }) on an unexpected
  // throw, instead of letting Express emit an HTML stack trace.
  let consoleErrorSpy;

  beforeEach(() => {
    // The handler logs the error via console.error — silence it to keep output clean.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns JSON 500 when a route throws an unexpected (non-constraint) error', async () => {
    // A db stub whose prepare() throws forces a route to throw a generic Error
    // that the route layer does not catch, exercising the global error handler.
    const brokenDb = {
      prepare() {
        throw new Error('boom');
      },
    };
    const brokenApp = createApp(brokenDb);

    const res = await request(brokenApp).get('/work-orders');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal server error' });
  });
});
