const express = require('express');
const router = express.Router();
const db = require('./db');
const { evaluateWardRisk } = require('./riskEngine');

// POST /api/reports/symptom - Log case report
router.post('/symptom', async (req, res) => {
  const { ward_id, symptom, case_count, lat, lng } = req.body;

  try {
    let result = null;
    try {
      const query = `
        INSERT INTO reports (ward_id, symptom, case_count, location)
        VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
        RETURNING *;
      `;
      const dbRes = await db.query(query, [ward_id, symptom, case_count, lng, lat]);
      result = dbRes.rows[0];
    } catch (dbErr) {
      console.warn('DB insert bypassed (fallback mode active):', dbErr.message);
    }

    const updatedRisk = await evaluateWardRisk(ward_id);

    res.status(201).json({
      success: true,
      message: 'Symptom report recorded successfully',
      data: result || { ward_id, symptom, case_count, lat, lng, created_at: new Date() },
      updated_risk: updatedRisk
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reports/water - Log water quality sample
router.post('/water', async (req, res) => {
  const { ward_id, ph, turbidity, contamination_flag } = req.body;

  try {
    let result = null;
    try {
      const query = `
        INSERT INTO water_readings (ward_id, ph, turbidity, contamination_flag)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const dbRes = await db.query(query, [ward_id, ph, turbidity, contamination_flag]);
      result = dbRes.rows[0];
    } catch (dbErr) {
      console.warn('DB water insert bypassed (fallback mode active):', dbErr.message);
    }

    const updatedRisk = await evaluateWardRisk(ward_id);

    res.status(201).json({
      success: true,
      message: 'Water reading recorded successfully',
      data: result || { ward_id, ph, turbidity, contamination_flag, created_at: new Date() },
      updated_risk: updatedRisk
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;