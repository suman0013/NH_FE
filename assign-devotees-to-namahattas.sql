-- Script to assign devotees to namahattas
-- This will distribute 250 devotees across 100 namahattas (average 2-3 devotees per namahatta)

WITH devotee_namahatta_assignment AS (
  SELECT 
    d.id as devotee_id,
    n.id as namahatta_id,
    ROW_NUMBER() OVER (ORDER BY d.id) as devotee_row,
    ROW_NUMBER() OVER (ORDER BY n.id) as namahatta_row
  FROM devotees d
  CROSS JOIN namahattas n
  WHERE (ROW_NUMBER() OVER (ORDER BY d.id) - 1) % 100 + 1 = ROW_NUMBER() OVER (ORDER BY n.id)
)
UPDATE devotees 
SET namahatta_id = (
  SELECT namahatta_id 
  FROM devotee_namahatta_assignment 
  WHERE devotee_namahatta_assignment.devotee_id = devotees.id
);