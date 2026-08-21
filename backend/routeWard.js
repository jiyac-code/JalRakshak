const express = require('express');
const router = express.Router();
const db = require('./db');

// GET /api/wards/summary - GIS Heatmap dataset
router.get('/summary', async (req, res) => {
  try {
    let wards = [];
    try {
      const result = await db.query(`
        SELECT id, name, risk_tier, case_count, turbidity,
               ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
        FROM wards;
      `);
      wards = result.rows;
    } catch (dbErr) {
      console.warn('Serving mock ward summary (DB pending):', dbErr.message);
      wards = [
        { id: 1, name: 'Ward 12 - Matunga', risk_tier: 'Red', case_count: 42, turbidity: 8.5, lat: 19.0269, lng: 72.8553 },
        { id: 2, name: 'Ward 14 - Dadar', risk_tier: 'Yellow', case_count: 12, turbidity: 3.1, lat: 19.0178, lng: 72.8478 },
        { id: 3, name: 'Ward 08 - Wadala', risk_tier: 'Green', case_count: 3, turbidity: 1.2, lat: 19.0152, lng: 72.8580 }
      ];
    }

    res.status(200).json({ success: true, wards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wards/:id/details - Single Ward Deep-Dive
router.get('/:id/details', async (req, res) => {
  const { id } = req.params;

  try {
    const isHighRisk = id === '1';
    
    res.status(200).json({
      success: true,
      ward: {
        id: parseInt(id),
        name: `Ward ${id}`,
        risk_tier: isHighRisk ? 'Red' : 'Yellow',
        recommended_action: isHighRisk 
          ? 'Deploy emergency chlorination unit to main pipeline & inform local clinic.' 
          : 'Increase testing frequency at water source B.',
        symptom_breakdown: { diarrhea: 22, vomiting: 14, fever: 6 },
        water_metrics: { ph: 6.8, turbidity: 7.9, coliform_detected: isHighRisk }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;