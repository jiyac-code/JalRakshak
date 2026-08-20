const axios = require('axios');

const RISK_ENGINE_URL = process.env.RISK_ENGINE_URL || 'http://localhost:8000';

// Sends ward data to Person 5's FastAPI service
const evaluateWardRisk = async (wardId) => {
  try {
    const response = await axios.post(`${RISK_ENGINE_URL}/evaluate`, { ward_id: wardId });
    return response.data;
  } catch (error) {
    console.error('Risk Engine Call Failed:', error.message);
    // Fallback response for prototype stability
    return { risk_tier: 'Yellow', recommendation: 'Monitor water source closely' };
  }
};

module.exports = { evaluateWardRisk };