-- Option A — QR Scan Event Log (1 table)

CREATE TABLE IF NOT EXISTS scan_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code     TEXT    NOT NULL,                -- format: QR-XXXXXX (6 alphanumerics)
  event_type  TEXT    NOT NULL CHECK (event_type IN ('IN', 'OUT', 'MOVE')),
  location    TEXT    NOT NULL,                -- max 20 chars (validate in API)
  scanned_by  TEXT    NOT NULL,                -- max 50 chars (validate in API)
  scanned_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_scan_events_scanned_at ON scan_events (scanned_at DESC);
