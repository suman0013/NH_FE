-- Quick fix to add missing district_supervisor_id column
-- This will get the app running while we can handle the larger address schema migration later

-- Add the missing district_supervisor_id column to namahattas table
ALTER TABLE namahattas ADD COLUMN IF NOT EXISTS district_supervisor_id INTEGER;

-- Create a default district supervisor if none exists
INSERT INTO leaders (name, role, location, created_at) VALUES
  ('Default District Supervisor', 'DISTRICT_SUPERVISOR', '{"country": "India", "state": "Default", "district": "Default"}', NOW())
ON CONFLICT (name) DO NOTHING;

-- Set all namahattas to use the default district supervisor temporarily
UPDATE namahattas 
SET district_supervisor_id = (
  SELECT id FROM leaders WHERE role = 'DISTRICT_SUPERVISOR' LIMIT 1
)
WHERE district_supervisor_id IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE namahattas ALTER COLUMN district_supervisor_id SET NOT NULL;

-- Verify the fix
SELECT COUNT(*) as total_namahattas, COUNT(district_supervisor_id) as with_supervisor 
FROM namahattas;