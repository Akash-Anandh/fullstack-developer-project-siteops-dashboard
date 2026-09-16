-- Optional: apply to an existing local database created from an older schema.sql.
-- Safe to run once; skips objects that already exist where possible.

ALTER TABLE Sites DROP CONSTRAINT IF EXISTS sites_status_check;
ALTER TABLE Sites
  ADD CONSTRAINT sites_status_check
  CHECK (status IN ('active', 'inactive', 'maintenance'));

ALTER TABLE Installations DROP CONSTRAINT IF EXISTS installations_status_check;
ALTER TABLE Installations
  ADD CONSTRAINT installations_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_installations_site_id ON Installations(site_id);
CREATE INDEX IF NOT EXISTS idx_installations_status ON Installations(status);
CREATE INDEX IF NOT EXISTS idx_sites_status ON Sites(status);
