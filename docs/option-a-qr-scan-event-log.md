# Option A — QR Scan Event Log API + Mini UI

Log QR scan events from the factory floor and show the recent list.

## Components

- `POST /scan` — log a scan event
- `GET /scans` — recent events, paginated
- Validation on all inputs
- SQLite storage (schema: [`schema/option-a.sql`](../schema/option-a.sql))
- Mini UI (optional stretch): a single HTML page that polls `GET /scans`

## API

### POST /scan

Request body:

```json
{
  "qr_code": "QR-A1B2C3",
  "event_type": "IN",
  "location": "WH-01",
  "scanned_by": "nguyen.van.a"
}
```

Validation rules:

| Field | Rule |
| ----- | ---- |
| `qr_code` | required, string, must match `QR-` followed by 6 alphanumerics |
| `event_type` | required, one of `IN` / `OUT` / `MOVE` |
| `location` | required, non-empty string, max 20 chars |
| `scanned_by` | required, non-empty string, max 50 chars |

Responses:

- `201` — `{ "id": 1, "qr_code": "...", "event_type": "...", "location": "...", "scanned_by": "...", "scanned_at": "<ISO timestamp>" }`
- `400` — `{ "error": "<which field failed and why>" }`

### GET /scans

Query params: `page` (default 1, min 1), `limit` (default 20, max 100).
Both must be positive integers — otherwise `400`.

Response `200` — newest first:

```json
{
  "data": [ { "id": 42, "qr_code": "QR-A1B2C3", "event_type": "IN", "location": "WH-01", "scanned_by": "nguyen.van.a", "scanned_at": "..." } ],
  "page": 1,
  "limit": 20,
  "total": 137
}
```

## Acceptance checklist

- [ ] Valid scan returns 201 with the stored row (including `id` and `scanned_at`)
- [ ] Each invalid field produces a 400 with a message naming the field
- [ ] `GET /scans` paginates correctly and sorts newest first
- [ ] `limit=101` and `page=0` are rejected with 400
- [ ] All endpoints covered by Jest tests (happy path + validation + edge cases)
