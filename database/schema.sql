-- ============================================================
-- Person 4 — Database Schema
-- Matches Person 3's routeReport.js / routeWard.js queries exactly:
--   - wards has: risk_tier, case_count, turbidity, location (point)
--   - reports has: ward_id, symptom, case_count, location
--   - water_readings has: ward_id, ph, turbidity, contamination_flag
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS water_readings CASCADE;
DROP TABLE IF EXISTS wards CASCADE;

-- ------------------------------------------------------------
-- WARDS
-- location = center point (used by Person 3's GET /summary)
-- risk_tier / case_count / turbidity are SNAPSHOT fields —
-- updated by the risk engine after each new report/reading
-- (kept denormalized on purpose so Person 3's summary query
-- stays a single cheap SELECT with no joins, good for a live demo)
-- ------------------------------------------------------------
CREATE TABLE wards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  population INT,
  risk_tier VARCHAR(10) DEFAULT 'Green',     -- Green / Yellow / Orange / Red
  case_count INT DEFAULT 0,                  -- rolling snapshot, last 7 days
  turbidity FLOAT DEFAULT 0,                 -- latest reading snapshot
  location GEOMETRY(Point, 4326) NOT NULL    -- ward center, used directly by Person 3
);

-- ------------------------------------------------------------
-- REPORTS  (matches POST /api/reports/symptom exactly)
-- ------------------------------------------------------------
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  ward_id INT REFERENCES wards(id),
  symptom VARCHAR(50),
  case_count INT DEFAULT 1,
  location GEOMETRY(Point, 4326),
  reported_by VARCHAR(20) DEFAULT 'health_worker',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- WATER_READINGS  (matches POST /api/reports/water exactly)
-- ------------------------------------------------------------
CREATE TABLE water_readings (
  id SERIAL PRIMARY KEY,
  ward_id INT REFERENCES wards(id),
  ph FLOAT,
  turbidity FLOAT,
  contamination_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Indexes — matter once ST_DWithin / geo queries run live in demo
-- ------------------------------------------------------------
CREATE INDEX idx_reports_location ON reports USING GIST (location);
CREATE INDEX idx_wards_location ON wards USING GIST (location);
CREATE INDEX idx_reports_ward_id ON reports (ward_id);
CREATE INDEX idx_water_ward_id ON water_readings (ward_id);