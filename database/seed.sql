-- ============================================================
-- Person 4 — Seed Data
-- Real Thane, Maharashtra locality coordinates
-- Run AFTER schema.sql
-- ============================================================

TRUNCATE water_readings, reports, wards RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- WARDS
-- risk_tier/case_count/turbidity below are the STARTING snapshot
-- shown on the map before any live demo submissions happen.
-- location = POINT(longitude latitude)
-- ------------------------------------------------------------
INSERT INTO wards (id, name, population, risk_tier, case_count, turbidity, location) VALUES
(1, 'Ward 7 - Kalwa',         85000, 'Yellow', 4,  6.6,  ST_SetSRID(ST_MakePoint(73.0120, 19.1972), 4326)),
(2, 'Ward 12 - Mumbra',      120000, 'Red',    18, 45.7, ST_SetSRID(ST_MakePoint(73.0284, 19.1857), 4326)),
(3, 'Ward 15 - Vartak Nagar', 95000, 'Green',  1,  2.1,  ST_SetSRID(ST_MakePoint(72.9670, 19.2020), 4326)),
(4, 'Ward 4 - Naupada',       60000, 'Green',  0,  1.8,  ST_SetSRID(ST_MakePoint(72.9715, 19.1918), 4326)),
(5, 'Ward 9 - Kausa',         70000, 'Orange', 9,  24.6, ST_SetSRID(ST_MakePoint(73.0310, 19.2010), 4326));

-- ------------------------------------------------------------
-- WATER READINGS
-- ------------------------------------------------------------
INSERT INTO water_readings (ward_id, ph, turbidity, contamination_flag, created_at) VALUES
(1, 6.8, 6.2,  false, NOW() - INTERVAL '2 days'),
(1, 6.7, 7.0,  false, NOW() - INTERVAL '1 days'),

(2, 5.4, 42.5, true,  NOW() - INTERVAL '3 days'),
(2, 5.1, 48.9, true,  NOW() - INTERVAL '1 days'),

(3, 7.2, 2.1,  false, NOW() - INTERVAL '2 days'),

(4, 7.0, 1.8,  false, NOW() - INTERVAL '2 days'),

(5, 6.0, 22.4, true,  NOW() - INTERVAL '2 days'),
(5, 5.9, 26.8, true,  NOW() - INTERVAL '1 days');

-- ------------------------------------------------------------
-- REPORTS
-- case_count is on each row here (matches Person 3's insert shape),
-- so total per ward = SUM(case_count), not COUNT(rows)
-- ------------------------------------------------------------

-- Ward 12 - Mumbra: several report rows summing to 18 cases (critical spike)
INSERT INTO reports (ward_id, symptom, case_count, location, reported_by, created_at) VALUES
(2, 'diarrhea', 6, ST_SetSRID(ST_MakePoint(73.0281, 19.1854), 4326), 'health_worker', NOW() - INTERVAL '3 days'),
(2, 'vomiting', 5, ST_SetSRID(ST_MakePoint(73.0288, 19.1861), 4326), 'health_worker', NOW() - INTERVAL '2 days'),
(2, 'fever',    4, ST_SetSRID(ST_MakePoint(73.0279, 19.1849), 4326), 'citizen',       NOW() - INTERVAL '2 days'),
(2, 'jaundice', 3, ST_SetSRID(ST_MakePoint(73.0291, 19.1863), 4326), 'health_worker', NOW() - INTERVAL '1 days');

-- Ward 9 - Kausa: sums to 9 (moderate/high rising trend)
INSERT INTO reports (ward_id, symptom, case_count, location, reported_by, created_at) VALUES
(5, 'diarrhea', 5, ST_SetSRID(ST_MakePoint(73.0313, 19.2013), 4326), 'health_worker', NOW() - INTERVAL '4 days'),
(5, 'vomiting', 4, ST_SetSRID(ST_MakePoint(73.0308, 19.2007), 4326), 'citizen',       NOW() - INTERVAL '2 days');

-- Ward 7 - Kalwa: sums to 4 (mild)
INSERT INTO reports (ward_id, symptom, case_count, location, reported_by, created_at) VALUES
(1, 'diarrhea', 2, ST_SetSRID(ST_MakePoint(73.0123, 19.1975), 4326), 'citizen', NOW() - INTERVAL '5 days'),
(1, 'fever',    2, ST_SetSRID(ST_MakePoint(73.0117, 19.1969), 4326), 'citizen', NOW() - INTERVAL '3 days');

-- Ward 15 - Vartak Nagar: 1 case (low)
INSERT INTO reports (ward_id, symptom, case_count, location, reported_by, created_at) VALUES
(3, 'fever', 1, ST_SetSRID(ST_MakePoint(72.9672, 19.2022), 4326), 'citizen', NOW() - INTERVAL '4 days');

-- Ward 4 - Naupada: 0 cases, no rows needed

-- ------------------------------------------------------------
-- SANITY CHECK QUERIES (run manually, not part of seed)
-- ------------------------------------------------------------

-- A) Matches Person 3's GET /api/wards/summary shape:
-- SELECT id, name, risk_tier, case_count, turbidity,
--        ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
-- FROM wards;

-- B) Correlation query: total cases per ward with contaminated water,
--    last 7 days
-- SELECT r.ward_id, w.name, SUM(r.case_count) AS total_cases
-- FROM reports r
-- JOIN wards w ON w.id = r.ward_id
-- WHERE r.ward_id IN (
--   SELECT DISTINCT ward_id FROM water_readings WHERE contamination_flag = true
-- )
-- AND r.created_at > NOW() - INTERVAL '7 days'
-- GROUP BY r.ward_id, w.name
-- ORDER BY total_cases DESC;