CREATE TABLE IF NOT EXISTS sheet_records (
  id BIGSERIAL PRIMARY KEY,
  spreadsheet_id TEXT NOT NULL,
  spreadsheet_name TEXT NOT NULL DEFAULT '',
  sheet_name TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  record_id TEXT NOT NULL,
  changed_column TEXT NOT NULL DEFAULT '',
  actor_email TEXT NOT NULL DEFAULT '',
  source_event_id TEXT NOT NULL DEFAULT '',
  source_event_type TEXT NOT NULL DEFAULT 'row_upsert',
  source_created_at TIMESTAMPTZ NULL,
  source_updated_at TIMESTAMPTZ NULL,
  source_triggered_at TIMESTAMPTZ NULL,
  row_data JSONB NOT NULL,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sheet_records_source UNIQUE (spreadsheet_id, sheet_name, record_id)
);

CREATE INDEX IF NOT EXISTS idx_sheet_records_sheet
  ON sheet_records (spreadsheet_id, sheet_name);

CREATE INDEX IF NOT EXISTS idx_sheet_records_updated_at
  ON sheet_records (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sheet_records_row_data
  ON sheet_records USING GIN (row_data);

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sheet_records_updated_at ON sheet_records;

CREATE TRIGGER trg_sheet_records_updated_at
BEFORE UPDATE ON sheet_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
