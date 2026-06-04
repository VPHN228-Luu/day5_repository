# Option C — Inspection Checklist Form

Pass/Fail input per checklist item, save the inspection result, and retrieve
history by date. Wireframe: [`wireframes/option-c.html`](../wireframes/option-c.html)

## Components

- `GET /checklist-items` — the fixed list of inspection items
- `POST /inspections` — submit one inspection (Pass/Fail per item)
- `GET /inspections?date=YYYY-MM-DD` — history for a given date
- SQLite storage (schema: [`schema/option-c.sql`](../schema/option-c.sql) —
  seeds 5 checklist items)
- Simple HTML form: one Pass/Fail radio pair per item + submit

## API

### GET /checklist-items

Response `200`:

```json
[ { "id": 1, "label": "Stitching quality" }, { "id": 2, "label": "Measurement within tolerance" } ]
```

### POST /inspections

Request body:

```json
{
  "inspector": "tran.thi.b",
  "lot_no": "LOT-0042",
  "results": [
    { "item_id": 1, "result": "PASS" },
    { "item_id": 2, "result": "FAIL" }
  ]
}
```

| Field | Rule |
| ----- | ---- |
| `inspector` | required, non-empty string, max 50 chars |
| `lot_no` | required, must match `LOT-` followed by 4 digits |
| `results` | required, non-empty array — one entry per checklist item, no missing or unknown `item_id`, no duplicates |
| `results[].result` | `PASS` or `FAIL` only |

`201` response:

```json
{ "id": 7, "inspector": "tran.thi.b", "lot_no": "LOT-0042", "inspected_at": "<ISO>", "overall": "FAIL", "results": [ ... ] }
```

`overall` is `PASS` only when every item passed. `400` on any validation
failure with a message naming the field.

### GET /inspections?date=YYYY-MM-DD

- `date` required, valid `YYYY-MM-DD` → otherwise `400`
- `200` — all inspections of that date (newest first), each with its
  per-item results

## Acceptance checklist

- [ ] Checklist items load from the DB (seeded by the schema)
- [ ] An inspection must answer every item — partial submissions rejected
- [ ] `overall` computed correctly (one FAIL → overall FAIL)
- [ ] History query returns only the requested date
- [ ] All endpoints covered by Jest tests (happy path + validation + edge cases)
