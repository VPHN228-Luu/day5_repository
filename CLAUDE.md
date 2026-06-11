# CLAUDE.md — SPELIX Capstone, Option B (Work Order Screen)

Project guidance for Claude Code. Authoritative spec: `docs/option-b-work-order-screen.md`.

## What this is

A small MES service: list work orders, create them, and advance their status through an enforced
state machine, plus a minimal HTML screen. Node.js + Express + better-sqlite3 + Jest/supertest.

## Architecture rules

- **App factory + dependency injection.** `src/app.js` exports `createApp(db)` and does NOT bind a
  port. `src/db.js` exports `createDb(path)` (applies `schema/option-b.sql`). `src/server.js` wires
  them and listens. Tests build `createApp(createDb(':memory:'))` for full isolation.
- **Schema is fixed.** Do not edit `schema/option-b.sql` columns. Load it verbatim in `db.js`.
  DB `CHECK` constraints are a backstop; the API validates first to return clean `400`s.
- **Validation lives in `src/validation.js`** as pure functions; routes stay thin.

## Domain rules (must hold)

### Fields / validation

| Field | Rule |
| --- | --- |
| `order_no` | required, regex `^WO-\d{4}-\d{4}$` (WO-YYYY-NNNN), unique |
| `style_code` | required, non-empty string, max 20 chars |
| `qty` | required, **integer** (reject floats & numeric strings), range 1–100000 |
| `status` | one of `PENDING`, `IN_PROGRESS`, `COMPLETED` |

Every `400` response body names the offending field, e.g.
`{ "error": "qty must be an integer between 1 and 100000" }`.

### API shape

- `POST /work-orders` → `201` with stored row (status defaults `PENDING`); `400` invalid;
  `409` duplicate `order_no` (catch `SQLITE_CONSTRAINT_UNIQUE`).
- `GET /work-orders?status=` → `200` array, `ORDER BY id ASC`; invalid `status` → `400`.
- `PATCH /work-orders/:id/status` → `200` updated row; `404` unknown id; `400` bad value or
  illegal transition. `:id` must be a plain run of digits — hex/scientific/signed forms
  (`0x1`, `1e3`, `-1`) resolve to `404`, never an unrelated row.

Request / response bodies (the canonical shape):

```jsonc
// POST /work-orders  (request)
{ "order_no": "WO-2026-0001", "style_code": "ST-100", "qty": 500 }

// stored row — returned by POST (201), each GET element, and PATCH (200)
{
  "id": 1,
  "order_no": "WO-2026-0001",
  "style_code": "ST-100",
  "qty": 500,
  "status": "PENDING",
  "created_at": "2026-06-11T03:01:01.982Z",
  "updated_at": "2026-06-11T03:01:01.982Z"
}

// PATCH /work-orders/:id/status  (request)
{ "status": "IN_PROGRESS" }

// any 4xx body
{ "error": "qty must be an integer between 1 and 100000" }
```

### Status state machine (only these transitions)

```
PENDING → IN_PROGRESS → COMPLETED
```

Map: `{ PENDING: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'], COMPLETED: [] }`.
No skipping, no going backward. `updated_at` must be set explicitly on every PATCH (the schema
DEFAULT only fires on INSERT).

## Workflow conventions (Day 5 mandatory)

- Plan first (`PLAN.md`), small commits (8+), `/review` before each feature commit.
- Delegate test writing to the `test-writer` sub-agent.
- `npm test` must be green before committing a feature.

## Commands

- `npm install` — install deps.
- `npm start` — run server on `http://localhost:3000`.
- `npm test` — run Jest suites.
