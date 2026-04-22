-- Migration: Add UNIQUE constraint to zoom_id in sessions table
-- Note: PostgreSQL allows multiple NULL values in a UNIQUE column.

ALTER TABLE sessions 
ADD CONSTRAINT sessions_zoom_id_key UNIQUE (zoom_id);
