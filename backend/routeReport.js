const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { calculateRiskScore } = require('./riskEngine');

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  waterSource: { type: String, required: true },
  riskFactors: { type: String, default: 'None' },
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, default: 'Low' },
  status: { type: String, enum: ['Suspected', 'Confirmed', 'Resolved'], default: 'Suspected' },
  date: { type: String },
  reportedAt: { type: Date, default: Date.now }
});

const Report = mongoose.model('Report', reportSchema);

module.exports = (io) => {
  // POST /api/reports
  router.post('/', async (req, res) => {
    try {
      const { location, ward, waterSource, riskFactors, status } = req.body;
      const targetWard = location || ward;

      if (!targetWard || !waterSource) {
        return res.status(400).json({ error: "Ward location and Water Source are required." });
      }

      const count = await Report.countDocuments();
      const reportId = `#RPT-${1043 + count}`;
      
      const parsedRiskFactors = Array.isArray(riskFactors) 
        ? riskFactors.join(', ') 
        : (riskFactors || 'None specified');

      const riskList = Array.isArray(riskFactors) 
        ? riskFactors 
        : (typeof riskFactors === 'string' ? riskFactors.split(', ') : []);

      const { score, riskLevel } = calculateRiskScore ? calculateRiskScore(riskList) : { score: 10, riskLevel: 'Low' };

      const formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const newReport = new Report({
        reportId,
        location: targetWard,
        waterSource,
        riskFactors: parsedRiskFactors,
        riskScore: score,
        riskLevel,
        status: status || 'Suspected',
        date: formattedDate
      });

      const savedReport = await newReport.save();

      // Automatically update or create corresponding Ward aggregation record
      const Ward = mongoose.model('Ward');
      await Ward.findOneAndUpdate(
        { name: targetWard },
        { $inc: { total_reported_cases: 1 } },
        { upsert: true, new: true }
      );

      // Emit socket event to update connected clients in real time
      io.emit('new_report_added', savedReport);

      return res.status(201).json({ success: true, report: savedReport });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/reports
  router.get('/', async (req, res) => {
    try {
      const { ward, location } = req.query;
      const filterWard = location || ward;
      
      const query = filterWard && filterWard !== 'ALL' && filterWard !== 'All Wards' ? { location: filterWard } : {};
      const reports = await Report.find(query).sort({ reportedAt: -1 });

      return res.status(200).json({ success: true, reports });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/reports/:id/status
  router.patch('/:id/status', async (req, res) => {
    try {
      const { status } = req.body;
      const updatedReport = await Report.findOneAndUpdate(
        { $or: [{ reportId: req.params.id }, { reportId: `#${req.params.id}` }] },
        { status },
        { new: true }
      );

      if (!updatedReport) return res.status(404).json({ error: "Report not found." });

      io.emit('report_status_updated', updatedReport);
      return res.status(200).json({ success: true, report: updatedReport });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
};