const RISK_WEIGHTS = {
  "Dirty / Muddy Water": 30,
  "Family Members Ill": 40,
  "Mosquitoes": 15,
  "Waterlogging": 15
};

function calculateRiskScore(riskFactors = []) {
  let score = 0;
  riskFactors.forEach(factor => {
    if (RISK_WEIGHTS[factor]) score += RISK_WEIGHTS[factor];
  });
  score = Math.min(score, 100);
  let status = "Suspected";
  let riskLevel = "Low";
  if (score >= 70) {
    status = "Confirmed";
    riskLevel = "High";
  } else if (score >= 40) {
    status = "Suspected";
    riskLevel = "Medium";
  }
  return { score, status, riskLevel };
}

module.exports = { calculateRiskScore, RISK_WEIGHTS };