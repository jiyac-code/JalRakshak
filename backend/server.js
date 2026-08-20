require('dotenv').config();
const express = require('express');
const cors = require('cors');

const reportsRoutes = require('./routeReport');
const wardsRoutes = require('./routeWard');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reports', reportsRoutes);
app.use('/api/wards', wardsRoutes);

// Health Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Core API active' });
});

const PORT = process.env.PORT || 5000;

// Store server instance so Node keeps event loop open
const server = app.listen(PORT, () => {
  console.log(`Core API running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});