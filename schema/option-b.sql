-- Option B — Work Order Screen (1 table)

CREATE TABLE IF NOT EXISTS work_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no    TEXT    NOT NULL UNIQUE,         -- format: WO-YYYY-NNNN
  style_code  TEXT    NOT NULL,                -- max 20 chars (validate in API)
  qty         INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 100000),
  status      TEXT    NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders (status);
