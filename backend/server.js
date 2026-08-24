const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { pool } = require('./db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enable CORS cleanly
app.use(cors({ origin: "*", methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH", "DELETE"] }
});

const DEFAULT_WARDS = [
  { name: "Ward 1 - Balkum", lat: 19.22, lng: 72.98 },
  { name: "Ward 2 - Majiwada", lat: 19.20, lng: 72.97 },
  { name: "Ward 3 - Vartak Nagar", lat: 19.21, lng: 72.96 },
  { name: "Ward 4 - Naupada", lat: 19.18, lng: 72.97 },
  { name: "Ward 5 - Kopri", lat: 19.17, lng: 72.98 },
  { name: "Ward 6 - Uthalsar", lat: 19.19, lng: 72.98 },
  { name: "Ward 7 - Kalwa", lat: 19.19, lng: 73.00 },
  { name: "Ward 8 - Mumbra", lat: 19.17, lng: 73.02 },
  { name: "Ward 9 - Diva", lat: 19.18, lng: 73.04 }
];

pool.connect(async (err, client, release) => {
  if (err) {
    console.error('PostgreSQL Connection Error:', err.stack);
    return;
  }
  console.log('Connected successfully to PostgreSQL Database (jalrakshak)');
  
  try {
    // Drop outdated reports table to rebuild missing columns cleanly
    await client.query(`DROP TABLE IF EXISTS reports CASCADE;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS water_readings (
        id SERIAL PRIMARY KEY,
        ward_name VARCHAR(255),
        ph NUMERIC,
        turbidity NUMERIC,
        tds NUMERIC,
        chlorine NUMERIC,
        risk_tier VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE reports (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50),
        location VARCHAR(255),
        water_source VARCHAR(100),
        risk_factors TEXT,
        risk_level VARCHAR(20) DEFAULT 'Low',
        status VARCHAR(50) DEFAULT 'Suspected',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      DELETE FROM water_readings 
      WHERE tds IS NULL OR ward_name IS NULL OR ward_name = 'null';
    `);

    console.log('Database tables cleanly initialized.');
  } catch (schemaErr) {
    console.error('Schema Sync Error:', schemaErr.message);
  }
  release();
});

io.on('connection', (socket) => {
  console.log('Socket Client Connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket Client Disconnected:', socket.id));
});

app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/api/wards/summary', async (req, res) => {
  try {
    const readings = await pool.query(`
      SELECT DISTINCT ON (ward_name) 
        ward_name, 
        risk_tier
      FROM water_readings 
      ORDER BY ward_name, created_at DESC
    `);

    const cases = await pool.query(`
      SELECT location, COUNT(*) AS total_cases 
      FROM reports GROUP BY location
    `);

    const riskMap = {};
    readings.rows.forEach(r => { riskMap[r.ward_name] = r.risk_tier; });

    const caseMap = {};
    cases.rows.forEach(c => { caseMap[c.location] = parseInt(c.total_cases); });

    const wards = DEFAULT_WARDS.map(w => ({
      name: w.name,
      risk_tier: riskMap[w.name] || 'GREEN',
      latitude: w.lat,
      longitude: w.lng,
      total_reported_cases: caseMap[w.name] || 0
    }));

    res.json({ success: true, wards });
  } catch (err) {
    console.error('Error fetching ward summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/lab-tests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ward_name AS "wardName", ph, turbidity, tds, chlorine, 
              risk_tier AS "predictedRiskTier", created_at AS "timestamp" 
       FROM water_readings 
       ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/lab-tests', async (req, res) => {
  try {
    const { wardName, ph, turbidity, tds, chlorine } = req.body;

    let predictedRiskTier = "GREEN";
    if (ph < 6.5 || ph > 8.5 || turbidity > 5 || tds > 500 || chlorine < 0.2) {
      predictedRiskTier = "ORANGE";
    }
    if (ph < 5.5 || turbidity > 10 || chlorine === 0) {
      predictedRiskTier = "RED";
    }

    const query = `
      INSERT INTO water_readings (ward_name, ph, turbidity, tds, chlorine, risk_tier, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, ward_name AS "wardName", ph, turbidity, tds, chlorine, risk_tier AS "predictedRiskTier", created_at AS "timestamp";
    `;
    const { rows } = await pool.query(query, [wardName, ph, turbidity, tds, chlorine, predictedRiskTier]);

    io.emit('ward_risk_updated', rows[0]);

    if (predictedRiskTier === 'RED') {
      io.emit('new_system_alert', { message: `Critical contamination detected in ${wardName}!` });
    }

    res.json({ success: true, prediction: predictedRiskTier, log: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const { location } = req.query;
    let queryText = `SELECT id AS "_id", report_id AS "reportId", 
                      TO_CHAR(created_at, 'YYYY-MM-DD HH12:MI AM') AS "date", 
                      location, water_source AS "waterSource", 
                      risk_factors AS "riskFactors", risk_level AS "riskLevel", status 
                     FROM reports`;
    const queryParams = [];

    if (location && location !== 'ALL') {
      queryText += ` WHERE location ILIKE $1`;
      queryParams.push(`%${location.replace(/^Ward \d+ - /, '')}%`);
    }
    queryText += ` ORDER BY created_at DESC`;

    const result = await pool.query(queryText, queryParams);

    if (result.rows.length === 0 && (!location || location === 'ALL')) {
      const sampleReports = [
        {
          _id: 1,
          reportId: "REP-1024",
          date: new Date().toISOString().split('T')[0] + " 10:30 AM",
          location: "Ward 4 - Naupada",
          waterSource: "Public Tap",
          riskFactors: "Dirty / Muddy Water, Family Members Ill",
          riskLevel: "High",
          status: "Confirmed"
        },
        {
          _id: 2,
          reportId: "REP-1025",
          date: new Date().toISOString().split('T')[0] + " 11:15 AM",
          location: "Ward 7 - Kalwa",
          waterSource: "Borewell",
          riskFactors: "Waterlogging",
          riskLevel: "Low",
          status: "Suspected"
        }
      ];
      return res.json({ success: true, reports: sampleReports });
    }

    res.json({ success: true, reports: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { location, waterSource, riskFactors } = req.body;
    const reportId = 'REP-' + Math.floor(1000 + Math.random() * 9000);
    const factorsText = Array.isArray(riskFactors) ? riskFactors.join(', ') : (riskFactors || 'None');
    const riskLevel = (Array.isArray(riskFactors) && riskFactors.length >= 2) ? 'High' : 'Low';

    const result = await pool.query(`
      INSERT INTO reports (report_id, location, water_source, risk_factors, risk_level, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'Suspected', NOW())
      RETURNING id AS "_id", report_id AS "reportId", location, water_source AS "waterSource", risk_factors AS "riskFactors", risk_level AS "riskLevel", status;
    `, [reportId, location, waterSource, factorsText, riskLevel]);

    io.emit('new_report_added', result.rows[0]);
    res.json({ success: true, report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/reports/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    await pool.query('UPDATE reports SET status = $1 WHERE id = $2', [status, id]);
    io.emit('report_status_updated', { id, status });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    io.emit('new_report_added');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`JalRakshak Engine listening on port ${PORT}`));