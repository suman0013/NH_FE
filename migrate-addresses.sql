-- Migrate existing address data to normalized structure
-- This script will move address data from JSON fields to the new normalized tables

-- First, let's migrate devotee addresses (present and permanent)
-- Extract present addresses for devotees
INSERT INTO devotee_addresses (devotee_id, address_id, address_type, landmark)
SELECT 
  d.id as devotee_id,
  a.id as address_id,
  'present' as address_type,
  json_extract(d.present_address, '$.landmark') as landmark
FROM devotees d
JOIN addresses a ON 
  json_extract(d.present_address, '$.country') = a.country AND
  json_extract(d.present_address, '$.state') = a.state AND
  json_extract(d.present_address, '$.district') = a.district AND
  json_extract(d.present_address, '$.subDistrict') = a.sub_district AND
  json_extract(d.present_address, '$.village') = a.village AND
  json_extract(d.present_address, '$.postalCode') = a.postal_code
WHERE d.present_address IS NOT NULL AND d.present_address != '';

-- Extract permanent addresses for devotees (if different from present)
INSERT INTO devotee_addresses (devotee_id, address_id, address_type, landmark)
SELECT 
  d.id as devotee_id,
  a.id as address_id,
  'permanent' as address_type,
  json_extract(d.permanent_address, '$.landmark') as landmark
FROM devotees d
JOIN addresses a ON 
  json_extract(d.permanent_address, '$.country') = a.country AND
  json_extract(d.permanent_address, '$.state') = a.state AND
  json_extract(d.permanent_address, '$.district') = a.district AND
  json_extract(d.permanent_address, '$.subDistrict') = a.sub_district AND
  json_extract(d.permanent_address, '$.village') = a.village AND
  json_extract(d.permanent_address, '$.postalCode') = a.postal_code
WHERE d.permanent_address IS NOT NULL AND d.permanent_address != ''
  AND d.permanent_address != d.present_address;

-- Migrate namahatta addresses
INSERT INTO namahatta_addresses (namahatta_id, address_id, landmark)
SELECT 
  n.id as namahatta_id,
  a.id as address_id,
  json_extract(n.address, '$.landmark') as landmark
FROM namahattas n
JOIN addresses a ON 
  json_extract(n.address, '$.country') = a.country AND
  json_extract(n.address, '$.state') = a.state AND
  json_extract(n.address, '$.district') = a.district AND
  json_extract(n.address, '$.subDistrict') = a.sub_district AND
  json_extract(n.address, '$.village') = a.village AND
  json_extract(n.address, '$.postalCode') = a.postal_code
WHERE n.address IS NOT NULL AND n.address != '';