-- Option C — Inspection Checklist (2 tables + seed data)

CREATE TABLE IF NOT EXISTS checklist_items (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  label  TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS inspections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inspector     TEXT    NOT NULL,              -- max 50 chars (validate in API)
  lot_no        TEXT    NOT NULL,              -- format: LOT-NNNN
  overall       TEXT    NOT NULL CHECK (overall IN ('PASS', 'FAIL')),
  inspected_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- per-item results stored as JSON: [{ "item_id": 1, "result": "PASS" }, ...]
  results_json  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inspections_inspected_at ON inspections (inspected_at DESC);

-- Seed: the 5 fixed checklist items
INSERT OR IGNORE INTO checklist_items (label) VALUES
  ('Stitching quality'),
  ('Measurement within tolerance'),
  ('Fabric defects'),
  ('Label and tag placement'),
  ('Packing condition');
