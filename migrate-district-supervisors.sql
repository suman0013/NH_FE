-- Migration script to assign district supervisors to existing namahattas
-- This script should be run after the district_supervisor_id column has been added

-- Step 1: Create sample district supervisors in leaders table (if not exists)
INSERT INTO leaders (name, role, location, created_at) VALUES
  ('HG Nitai Gauranga Das', 'DISTRICT_SUPERVISOR', '{"country": "India", "state": "West Bengal", "district": "Bankura"}', NOW()),
  ('HG Chaitanya Das', 'DISTRICT_SUPERVISOR', '{"country": "India", "state": "West Bengal", "district": "Nadia"}', NOW()),
  ('HG Radha Krishna Das', 'DISTRICT_SUPERVISOR', '{"country": "India", "state": "West Bengal", "district": "Kolkata"}', NOW()),
  ('HG Bhakti Priya Das', 'DISTRICT_SUPERVISOR', '{"country": "India", "state": "Odisha", "district": "Cuttack"}', NOW()),
  ('HG Vrindavan Das', 'DISTRICT_SUPERVISOR', '{"country": "India", "state": "Odisha", "district": "Bhubaneswar"}', NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 2: Update existing namahattas to assign district supervisors based on their address district
-- This assumes that namahatta addresses are stored in the namahatta_addresses table
-- and can be joined with the addresses table to get district information

UPDATE namahattas 
SET district_supervisor_id = (
  SELECT l.id 
  FROM leaders l
  WHERE l.role = 'DISTRICT_SUPERVISOR' 
    AND l.location->>'district' = (
      SELECT a.district_name_english 
      FROM namahatta_addresses na 
      JOIN addresses a ON na.address_id = a.id 
      WHERE na.namahatta_id = namahattas.id 
      LIMIT 1
    )
  LIMIT 1
)
WHERE district_supervisor_id IS NULL;

-- Step 3: For namahattas that still don't have a supervisor assigned, assign a default supervisor
-- This handles edge cases where district doesn't match any supervisor
UPDATE namahattas 
SET district_supervisor_id = (
  SELECT id FROM leaders WHERE role = 'DISTRICT_SUPERVISOR' LIMIT 1
)
WHERE district_supervisor_id IS NULL;

-- Step 4: Verify the migration
SELECT 
  COUNT(*) as total_namahattas,
  COUNT(district_supervisor_id) as namahattas_with_supervisor,
  COUNT(*) - COUNT(district_supervisor_id) as namahattas_without_supervisor
FROM namahattas;

-- Step 5: Show the distribution of namahattas by supervisor
SELECT 
  l.name as supervisor_name,
  l.location->>'district' as district,
  COUNT(n.id) as namahatta_count
FROM leaders l
LEFT JOIN namahattas n ON l.id = n.district_supervisor_id
WHERE l.role = 'DISTRICT_SUPERVISOR'
GROUP BY l.id, l.name, l.location->>'district'
ORDER BY namahatta_count DESC;