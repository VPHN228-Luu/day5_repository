# Option B — Work Order Screen

A list of work orders with start/complete status toggling and status filter.
Wireframe: [`wireframes/option-b.html`](../wireframes/option-b.html)

## Components

- `GET /work-orders` — list view, filterable by status
- `POST /work-orders` — create a work order
- `PATCH /work-orders/:id/status` — start / complete toggle
- SQLite storage (schema: [`schema/option-b.sql`](../schema/option-b.sql))
- Simple HTML screen: table + filter dropdown + Start/Complete buttons

## API

### GET /work-orders

Query param: `status` (optional, one of `PENDING` / `IN_PROGRESS` / `COMPLETED`).
Invalid status value → `400`.

Response `200`:

```json
[ { "id": 1, "order_no": "WO-2026-0001", "style_code": "ST-100", "qty": 500, "status": "PENDING", "created_at": "...", "updated_at": "..." } ]
```

### POST /work-orders

Request body:

```json
{ "order_no": "WO-2026-0001", "style_code": "ST-100", "qty": 500 }
```

| Field | Rule |
| ----- | ---- |
| `order_no` | required, must match `WO-YYYY-NNNN`, unique (duplicate → 409) |
| `style_code` | required, non-empty string, max 20 chars |
| `qty` | required, integer, 1–100000 |

`201` with the created row (status starts as `PENDING`), `400` on validation
failure, `409` on duplicate `order_no`.

### PATCH /work-orders/:id/status

Request body: `{ "status": "IN_PROGRESS" }` or `{ "status": "COMPLETED" }`

Allowed transitions only:

```
PENDING → IN_PROGRESS → COMPLETED
```

- `200` with the updated row on a valid transition
- `400` on an invalid transition (e.g. PENDING → COMPLETED) or bad status value
- `404` if the work order does not exist

## Acceptance checklist

- [ ] Create / list / filter by status all work
- [ ] Status transitions enforced (no skipping, no going backward)
- [ ] Duplicate `order_no` rejected with 409
- [ ] Screen shows the list, filters, and toggles status via the API
- [ ] All endpoints covered by Jest tests (happy path + validation + transitions)
