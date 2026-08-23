import React, { useState } from "react";

const API_BASE = "http://localhost:8000";

export default function AdminDashboard() {
  // Form 1 State
  const [scoreData, setScoreData] = useState({
    turbidity: 12.5,
    ph: 7.2,
    population: 5000,
    case_count: 8,
    contamination_flag: false,
  });
  const [scoreResult, setScoreResult] = useState(null);

  // Form 2 State
  const [causeData, setCauseData] = useState({
    ward_id: 101,
    turbidity: 15.0,
    waterborne_symptom_ratio: 0.75,
    contamination_flag: true,
  });
  const [causeResult, setCauseResult] = useState(null);

  // Form 3 State
  const [confirmData, setConfirmData] = useState({
    ward_id: 101,
    risk_tier: "Green",
    is_waterborne: true,
  });
  const [adminResult, setAdminResult] = useState(null);

  // Handlers
  const handleScoreSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turbidity: parseFloat(scoreData.turbidity),
          ph: parseFloat(scoreData.ph),
          population: parseInt(scoreData.population, 10),
          case_count: parseInt(scoreData.case_count, 10),
          contamination_flag: scoreData.contamination_flag,
        }),
      });
      const data = await res.json();
      setScoreResult(data);
    } catch (err) {
      alert("Failed to connect to API server.");
    }
  };

  const handleCauseSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/predict-cause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward_id: parseInt(causeData.ward_id, 10),
          turbidity: parseFloat(causeData.turbidity),
          waterborne_symptom_ratio: parseFloat(causeData.waterborne_symptom_ratio),
          contamination_flag: causeData.contamination_flag,
        }),
      });
      const data = await res.json();
      setCauseResult(data);
    } catch (err) {
      alert("Failed to connect to API server.");
    }
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ward_id: parseInt(confirmData.ward_id, 10),
      turbidity: 12.5,
      ph: 7.2,
      contamination_flag: true,
      case_rate_per_1000: 1.6,
      waterborne_symptom_ratio: 0.8,
      risk_tier: confirmData.risk_tier,
      is_waterborne: confirmData.is_waterborne,
    };

    try {
      const res = await fetch(`${API_BASE}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setAdminResult({ type: "success", text: data.message });
    } catch (err) {
      alert("Failed to connect to API server.");
    }
  };

  const handleRetrain = async () => {
    try {
      const res = await fetch(`${API_BASE}/retrain`, { method: "POST" });
      const data = await res.json();
      setAdminResult({
        type: "info",
        text: `Models retrained successfully using ${data.total_rows_used} total rows!`,
      });
    } catch (err) {
      alert("Failed to connect to API server.");
    }
  };

  return (
    <div className="dashboard-container">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg-image: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvFya8gxANJ9QHrJDW-dbF_g-ZPgxPr-54GMCo4_7p5A&s=10');
          --header-bg: rgba(255, 255, 255, 0.65);
          --card-bg: rgba(255, 255, 255, 0.75);
          --card-border: rgba(255, 255, 255, 0.8);
          --input-bg: rgba(255, 255, 255, 0.6);
          --input-border: rgba(203, 213, 225, 0.6);
          --accent: #3b82f6;
          --accent-hover: #2563eb;
          --accent-light: rgba(239, 246, 255, 0.8);
          --accent-glow: rgba(59, 130, 246, 0.25);
          --text: #0f172a;
          --text-dim: #64748b;
          --pastel-green: #22c55e;
          --pastel-green-bg: #f0fdf4;
          --pastel-green-border: rgba(74, 222, 128, 0.5);
          --pastel-green-text: #15803d;
          --pastel-yellow-bg: #fefce8;
          --pastel-yellow-border: rgba(250, 204, 21, 0.5);
          --pastel-yellow-text: #a16207;
          --pastel-orange-bg: #fff7ed;
          --pastel-orange-border: rgba(251, 146, 60, 0.5);
          --pastel-orange-text: #c2410c;
          --pastel-red-bg: #fef2f2;
          --pastel-red-border: rgba(248, 113, 113, 0.5);
          --pastel-red-text: #b91c1c;
          --radius-lg: 20px;
          --radius-md: 10px;
          --radius-sm: 6px;
          --shadow-glass: 0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
          --shadow-hover: 0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.06);
          --transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dashboard-container {
          background-image: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.4), transparent 70%), var(--bg-image);
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          color: var(--text);
          padding: 3rem 1.5rem;
          max-width: 1320px;
          margin: 0 auto;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          backdrop-filter: blur(16px);
          background: var(--header-bg);
          border: 1px solid var(--card-border);
          padding: 1.1rem 1.75rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-glass);
        }

        .brand-title { display: flex; align-items: center; gap: 0.85rem; }
        .brand-title span {
          width: 14px; height: 14px; background: var(--accent); border-radius: 50%;
          box-shadow: 0 0 12px var(--accent); animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        .dashboard-header h1 { font-size: 1.45rem; font-weight: 800; margin: 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; }

        .card {
          background: var(--card-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: var(--shadow-glass);
          transition: var(--transition);
          display: flex;
          flex-direction: column;
        }

        .card:hover { box-shadow: var(--shadow-hover); transform: translateY(-4px); border-color: #fff; }
        .card h2 { font-size: 1.15rem; font-weight: 700; margin: 0 0 1.5rem 0; border-bottom: 1px solid rgba(226, 232, 240, 0.8); padding-bottom: 0.85rem; }

        .form-group { margin-bottom: 1.25rem; }
        .form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-dim); margin-bottom: 0.45rem; text-transform: uppercase; }

        .form-group input[type="number"], .form-group select {
          width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-md);
          border: 1px solid var(--input-border); background: var(--input-bg);
          color: var(--text); font-size: 0.95rem; font-weight: 500; outline: none; box-sizing: border-box;
        }

        .checkbox-group { display: flex; align-items: center; background: var(--input-bg); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--input-border); }
        .checkbox-group input[type="checkbox"] { accent-color: var(--accent); width: 18px; height: 18px; margin-right: 0.75rem; }

        button.btn {
          width: 100%; padding: 0.85rem 1.25rem; border: none; border-radius: var(--radius-md);
          background: var(--accent); color: #fff; font-weight: 700; font-size: 0.925rem; cursor: pointer; transition: var(--transition); margin-top: 0.5rem;
        }
        button.btn:hover { background: var(--accent-hover); transform: translateY(-2px); }
        button.btn.secondary { background: var(--accent-light); border: 1px solid rgba(147, 197, 253, 0.5); color: #1d4ed8; }

        .result-box {
          margin-top: 1.5rem; padding: 1.15rem 1.25rem; border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(226, 232, 240, 0.9);
        }
        .result-box p { margin: 0 0 0.4rem 0; font-size: 0.925rem; display: flex; justify-content: space-between; }
        .result-box p:last-child { margin: 0; }

        .tier-indicator { font-weight: 800; font-size: 0.85rem; padding: 0.3rem 0.75rem; border-radius: var(--radius-sm); text-transform: uppercase; }
        .tier-Green { color: var(--pastel-green-text); background: var(--pastel-green-bg); border: 1px solid var(--pastel-green-border); }
        .tier-Yellow { color: var(--pastel-yellow-text); background: var(--pastel-yellow-bg); border: 1px solid var(--pastel-yellow-border); }
        .tier-Orange { color: var(--pastel-orange-text); background: var(--pastel-orange-bg); border: 1px solid var(--pastel-orange-border); }
        .tier-Red { color: var(--pastel-red-text); background: var(--pastel-red-bg); border: 1px solid var(--pastel-red-border); }

        hr { border: 0; height: 1px; background: rgba(226, 232, 240, 0.8); margin: 1.75rem 0; }
      ` }} />

      <header className="dashboard-header">
        <div className="brand-title">
          <span />
          <h1>Admin Dashboard</h1>
        </div>
      </header>

      <div className="grid">
        {/* Panel 1 */}
        <div className="card">
          <h2>1. Score Ward Risk</h2>
          <form onSubmit={handleScoreSubmit}>
            <div className="form-group">
              <label>Turbidity (NTU)</label>
              <input type="number" step="0.1" value={scoreData.turbidity} onChange={(e) => setScoreData({ ...scoreData, turbidity: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>pH Level</label>
              <input type="number" step="0.1" value={scoreData.ph} onChange={(e) => setScoreData({ ...scoreData, ph: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Population</label>
              <input type="number" value={scoreData.population} onChange={(e) => setScoreData({ ...scoreData, population: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Active Case Count</label>
              <input type="number" value={scoreData.case_count} onChange={(e) => setScoreData({ ...scoreData, case_count: e.target.value })} required />
            </div>
            <div className="form-group checkbox-group">
              <input type="checkbox" id="score-flag" checked={scoreData.contamination_flag} onChange={(e) => setScoreData({ ...scoreData, contamination_flag: e.target.checked })} />
              <label htmlFor="score-flag" style={{ margin: 0, textTransform: "none", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>Contamination Flagged</label>
            </div>
            <button type="submit" className="btn">Calculate Risk Score</button>
          </form>
          {scoreResult && (
            <div className="result-box">
              <p>Risk Tier: <span className={`tier-indicator tier-${scoreResult.risk_tier}`}>{scoreResult.risk_tier}</span></p>
              <p>Score Points: <strong>{scoreResult.risk_score}</strong></p>
              <p style={{ marginTop: "0.5rem", color: "var(--text-dim)", display: "block" }}><strong>Action:</strong> {scoreResult.recommended_action}</p>
            </div>
          )}
        </div>

        {/* Panel 2 */}
        <div className="card">
          <h2>2. Predict Waterborne Cause</h2>
          <form onSubmit={handleCauseSubmit}>
            <div className="form-group">
              <label>Ward ID</label>
              <input type="number" value={causeData.ward_id} onChange={(e) => setCauseData({ ...causeData, ward_id: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Turbidity (NTU)</label>
              <input type="number" step="0.1" value={causeData.turbidity} onChange={(e) => setCauseData({ ...causeData, turbidity: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Symptom Ratio (0.0 – 1.0)</label>
              <input type="number" step="0.01" min="0" max="1" value={causeData.waterborne_symptom_ratio} onChange={(e) => setCauseData({ ...causeData, waterborne_symptom_ratio: e.target.value })} required />
            </div>
            <div className="form-group checkbox-group">
              <input type="checkbox" id="cause-flag" checked={causeData.contamination_flag} onChange={(e) => setCauseData({ ...causeData, contamination_flag: e.target.checked })} />
              <label htmlFor="cause-flag" style={{ margin: 0, textTransform: "none", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>Contamination Flagged</label>
            </div>
            <button type="submit" className="btn">Predict Cause</button>
          </form>
          {causeResult && (
            <div className="result-box">
              <p>Waterborne Likely: <strong style={{ color: causeResult.is_waterborne_likely ? "var(--pastel-red-text)" : "var(--pastel-green-text)" }}>{causeResult.is_waterborne_likely ? "YES" : "NO"}</strong></p>
            </div>
          )}
        </div>

        {/* Panel 3 */}
        <div className="card">
          <h2>3. Admin Actions & Retrain</h2>
          <form onSubmit={handleConfirmSubmit}>
            <div className="form-group">
              <label>Ward ID</label>
              <input type="number" value={confirmData.ward_id} onChange={(e) => setConfirmData({ ...confirmData, ward_id: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Assigned Risk Tier</label>
              <select value={confirmData.risk_tier} onChange={(e) => setConfirmData({ ...confirmData, risk_tier: e.target.value })}>
                <option value="Green">Green</option>
                <option value="Yellow">Yellow</option>
                <option value="Orange">Orange</option>
                <option value="Red">Red</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <input type="checkbox" id="conf-waterborne" checked={confirmData.is_waterborne} onChange={(e) => setConfirmData({ ...confirmData, is_waterborne: e.target.checked })} />
              <label htmlFor="conf-waterborne" style={{ margin: 0, textTransform: "none", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>Confirmed Waterborne Outbreak</label>
            </div>
            <button type="submit" className="btn secondary">Save Admin Confirmation</button>
          </form>
          <hr />
          <button onClick={handleRetrain} className="btn">Trigger Model Retraining</button>
          {adminResult && (
            <div className="result-box">
              <p style={{ color: adminResult.type === "success" ? "var(--pastel-green-text)" : "var(--accent-hover)", fontWeight: 600 }}>{adminResult.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}