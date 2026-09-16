-- Drop unused Users relation and installation metadata columns.
-- Safe to re-run: IF EXISTS / IF EXISTS column checks.

ALTER TABLE Installations DROP COLUMN IF EXISTS installed_by;
ALTER TABLE Installations DROP COLUMN IF EXISTS installed_at;
DROP TABLE IF EXISTS Users;
