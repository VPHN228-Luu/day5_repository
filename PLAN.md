# Plan — Day 5 Capstone, Option B: Work Order Screen

## Context

This is the **SPELIX Capstone Mini Project (Day 5)**. The repo started as a *specification only*
— README, `docs/`, `schema/`, `wireframes/`, no source code. The mandatory workflow's first rule
is: **"Plan Mode first — not a single line of code before seeing a plan. Commit the plan as
`PLAN.md`."** This document is that plan.

We are building **Option B — Work Order Screen**: a small Node.js MES service that lists work
orders, creates them, and toggles their status through an enforced state machine, plus a minimal
HTML screen. Stack: **Express + better-sqlite3 + Jest/supertest**. Outcome: all three endpoints
working, validation and status transitions enforced, full test coverage, and a browser screen —
built in 8+ small commits with `/review` before each.

Authoritative spec: `docs/option-b-work-order-screen.md`. DB schema is fixed in
`schema/option-b.sql` (do **not** redefine columns — load this file as-is).

## Target project structure

```
day5_repository/
├── PLAN.md                     # this plan, committed first
├── CLAUDE.md                   # scenario rules (mandatory workflow step 2)
├── package.json                # scripts + deps + jest config
├── .gitignore                  # exists (node_modules/, data.db, .env)
├── schema/option-b.sql         # exists — load verbatim, do not edit
├── wireframes/option-b.html    # exists — UI reference
├── src/
│   ├── db.js                   # createDb(path) → better-sqlite3 instance + schema applied
│   ├── app.js                  # createApp(db) → Express app (NO listen) for testability
│   ├── server.js               # entry: createApp(createDb(DB_PATH)).listen(PORT)
│   ├── validation.js           # pure validators → { ok, errors } / field messages
│   └── routes/workOrders.js    # the 3 endpoints, mounted on createApp
├── public/index.html           # work order screen (table + filter + Start/Complete)
├── tests/workOrders.test.js    # Jest + supertest, in-memory DB per suite
└── .claude/
    ├── commands/review.md      # from Day 4 (copy or minimal stub)
    └── agents/test-writer.md   # from Day 4 (copy or minimal stub)
```

## Key design decisions

- **App-factory + DI.** `createApp(db)` takes a db instance; `createDb(path)` builds a
  better-sqlite3 connection and runs `schema/option-b.sql`. Tests pass `createDb(':memory:')`
  for full isolation; `server.js` passes `process.env.DB_PATH || 'data.db'`. No port is bound in
  `app.js`, so supertest drives the app directly.
- **Schema is source of truth.** `db.js` reads and executes `schema/option-b.sql` (the `CHECK`
  constraints on `qty` and `status` are a backstop; the API still validates first for clean 400s).
- **Duplicate `order_no`.** Insert and catch better-sqlite3's `SQLITE_CONSTRAINT_UNIQUE`
  (`err.code`) → respond `409`. Atomic, no read-then-write race.
- **`updated_at` on PATCH.** The schema DEFAULT only fires on INSERT, so the UPDATE statement
  must set `updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')` explicitly.
- **List ordering.** Spec is silent; return rows `ORDER BY id ASC` (creation order, matches the
  wireframe sample).

## Validation rules (from spec → `validation.js`)

| Field | Rule | Failure |
| --- | --- | --- |
| `order_no` | required, matches `^WO-\d{4}-\d{4}$` (WO-YYYY-NNNN) | 400 (or 409 if duplicate) |
| `style_code` | required, non-empty string, ≤ 20 chars | 400 |
| `qty` | required, **integer** (reject floats/strings), 1–100000 | 400 |
| `status` (query / PATCH body) | one of `PENDING` / `IN_PROGRESS` / `COMPLETED` | 400 |

Each 400 returns a body naming the offending field, e.g.
`{ "error": "qty must be an integer between 1 and 100000" }`.

## Endpoints (`src/routes/workOrders.js`)

1. **`POST /work-orders`** — validate body → INSERT (status defaults `PENDING`) → `201` with the
   stored row. `400` on validation failure; `409` on duplicate `order_no`.
2. **`GET /work-orders?status=`** — optional `status`; if present and invalid → `400`. Otherwise
   SELECT (filtered when provided), `200` with array, `ORDER BY id ASC`.
3. **`PATCH /work-orders/:id/status`** — look up row → `404` if missing. Validate `status` value
   → `400` if not in enum. Enforce transitions: `PENDING→IN_PROGRESS`, `IN_PROGRESS→COMPLETED`
   only; anything else (skip, backward, from COMPLETED) → `400`. On success UPDATE status +
   `updated_at`, return `200` with the updated row.

Transition map: `{ PENDING: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'], COMPLETED: [] }`.

## HTML screen (`public/index.html`)

Vanilla JS based on `wireframes/option-b.html`, served via `express.static('public')`:
- Filter `<select>` (ALL / PENDING / IN_PROGRESS / COMPLETED) → `GET /work-orders?status=…`
  (ALL omits the param) and re-render the table.
- `Start` button → `PATCH /:id/status {status:'IN_PROGRESS'}`; `Complete` →
  `{status:'COMPLETED'}`; COMPLETED rows show `—` (no action). Re-fetch after each action.

## Tests (`tests/workOrders.test.js`, delegated to `test-writer` sub-agent)

Coverage:
- **POST**: happy path → 201 + status `PENDING`; bad `order_no` format; missing fields;
  `style_code` > 20 chars; `qty` out-of-range; `qty` non-integer → each 400; duplicate → 409.
- **GET**: list all; filter by each status; invalid `status` → 400; empty DB → `[]`.
- **PATCH**: valid `PENDING→IN_PROGRESS→COMPLETED` → 200; invalid transition
  (`PENDING→COMPLETED`, backward, from COMPLETED) → 400; bad status value → 400; unknown id → 404.

Each test suite builds its own `createApp(createDb(':memory:'))`.

## package.json

- deps: `express`, `better-sqlite3`; devDeps: `jest`, `supertest`.
- scripts: `"start": "node src/server.js"`, `"test": "jest"`.
- `"jest": { "testEnvironment": "node" }`.

## Commit sequence (aim 8+ commits, `/review` before each feature commit)

1. `docs: add PLAN.md`.
2. `chore: scaffold project` — package.json, deps, `src/db.js`, `src/app.js`, `src/server.js`,
   `.claude/` templates, and **CLAUDE.md** with scenario rules.
3. `feat: POST /work-orders with validation` + tests → `npm test` → `/review` → commit.
4. `feat: GET /work-orders with status filter` + tests → `/review` → commit.
5. `feat: PATCH status with transition enforcement` + tests → `/review` → commit.
6. `feat: work order HTML screen` → manual browser check → commit.
7. `docs: refine CLAUDE.md / notes` if review surfaces rule gaps.
8. `chore: final end-to-end pass` — curl smoke test of all endpoints.

## Verification (end-to-end)

1. **Automated**: `npm install` then `npm test` — all Jest suites green.
2. **Manual API** (`npm start`, default `http://localhost:3000`): POST valid → 201; duplicate →
   409; `qty:0` → 400; `GET ?status=PENDING` → array; PATCH `IN_PROGRESS`→`COMPLETED` → 200;
   skip transition → 400; unknown id → 404.
3. **Manual UI**: open `http://localhost:3000/` — list, filter, Start/Complete buttons work;
   COMPLETED rows show `—`.

## Out of scope / notes

- The 5-minute demo recording and 1-page retrospective are submission deliverables, not code.
- `.claude/commands/review.md` and `.claude/agents/test-writer.md` come from Day 4; minimal
  working stubs are created during scaffold so the workflow can run.
