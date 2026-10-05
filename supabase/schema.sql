-- Schema setup for Partly
CREATE TABLE IF NOT EXISTS kv_store_488bc5db (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE kv_store_488bc5db ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'kv_store_488bc5db' AND policyname = 'Allow public access'
  ) THEN
    CREATE POLICY "Allow public access" ON kv_store_488bc5db
      FOR ALL TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
