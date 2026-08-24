const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Schema aligned with server.js including risk_tier
const wardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  latitude: { type: Number, default: 19.18 },
  longitude: { type: Number, default: 73.02 },
  total_reported_cases: { type: Number, default: 0 },
  turbidity: { type: Number, default: 5.0 },
  ph: { type: Number, default: 7.2 },
  risk_tier: { type: String, enum: ['GREEN', 'YELLOW', 'ORANGE', 'RED'], default: 'GREEN' }
});

// Re-use model if already declared in server.js to prevent overwrite errors
const Ward = mongoose.models.Ward || mongoose.model('Ward', wardSchema);

// Pre-populate coordinates for Mumbai/Thane Wards
const WARD_COORDINATES = {
  "Ward 7 - Kalwa": { lat: 19.1982, lng: 72.9991 },
  "Ward 12 - Mumbra": { lat: 19.1793, lng: 73.0232 },
  "Ward 15 - Vartak Nagar": { lat: 19.2183, lng: 72.9634 },
  "Ward 4 - Naupada": { lat: 19.1868, lng: 72.9735 },
  "Ward 9 - Kausa": { lat: 19.1584, lng: 73.0315 }
};

// GET /api/wards/summary
router.get('/summary', async (req, res) => {
  try {
    let wards = await Ward.find();

    // Seed initial default wards if DB is empty
    if (wards.length === 0) {
      const defaultWards = Object.keys(WARD_COORDINATES).map((wardName) => ({
        name: wardName,
        latitude: WARD_COORDINATES[wardName].lat,
        longitude: WARD_COORDINATES[wardName].lng,
        total_reported_cases: 0,
        turbidity: 4.5,
        ph: 7.1,
        risk_tier: 'GREEN'
      }));
      wards = await Ward.insertMany(defaultWards);
    }

    // Combine lab-assigned risk tiers with dynamic case count thresholds
    const formattedWards = wards.map(w => {
      let computed_tier = w.risk_tier || 'GREEN';

      // Elevate risk tier if report count exceeds threshold, without overwriting explicit RED tiers
      if (w.total_reported_cases >= 10) {
        computed_tier = 'RED';
      } else if (w.total_reported_cases >= 5 && computed_tier !== 'RED') {
        computed_tier = 'ORANGE';
      } else if (w.total_reported_cases >= 2 && !['RED', 'ORANGE'].includes(computed_tier)) {
        computed_tier = 'YELLOW';
      }

      const coords = WARD_COORDINATES[w.name] || { lat: w.latitude, lng: w.longitude };

      return {
        id: w._id,
        name: w.name,
        latitude: coords.lat,
        longitude: coords.lng,
        total_reported_cases: w.total_reported_cases,
        turbidity: w.turbidity,
        ph: w.ph,
        risk_tier: computed_tier
      };
    });

    return res.status(200).json({ success: true, wards: formattedWards });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/wards/kpi
router.get('/kpi', async (req, res) => {
  try {
    const Report = mongoose.model('Report');
    const criticalAlerts = await Report.countDocuments({ status: 'Confirmed' });
    const criticalWards = await Report.distinct('location', { status: 'Confirmed' });

    return res.status(200).json({
      totalContaminationAlerts: criticalAlerts,
      flaggedWards: criticalWards,
      statusMessage: criticalWards.length > 0 
        ? `${criticalWards.length} Critical flags in ${criticalWards.join(' & ')}`
        : 'All monitored wards operating at safe levels.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;