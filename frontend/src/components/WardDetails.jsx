import React, { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function WardDetails({ ward }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ward) return;

    // Resolve ward identifier (handles both `ward.id` and `ward.ward_id`)
    const wardId = ward.ward_id || ward.id;

    setLoading(true);
    setError(null);
    setDetails(null);

    fetch(`${API_BASE}/api/wards/${wardId}/details`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch detailed ward information.");
        }
        return response.json();
      })
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ward details fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [ward]);

  const getRiskClass = (risk) => {
    switch (risk?.toUpperCase()) {
      case "GREEN":
        return "risk-green";
      case "YELLOW":
        return "risk-yellow";
      case "ORANGE":
        return "risk-orange";
      case "RED":
        return "risk-red";
      default:
        return "risk-gray";
    }
  };

  if (!ward) return null;

  if (loading) {
    return (
      <section className="ward-card">
        <p>Loading ward information for {ward.name || `Ward ${ward.ward_id}`}...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ward-card">
        <h2>{ward.name || `Ward ${ward.ward_id}`}</h2>
        <p className="error-text">{error}</p>
      </section>
    );
  }

  // Merging details API response with fallback initial ward props
  const risk = details?.risk_tier || ward.risk_tier || "GREEN";
  const symptoms = details?.symptom_breakdown || {};
  const water = details?.water_metrics || {};
  const caseCount = details?.total_cases ?? ward.total_reported_cases ?? ward.case_count ?? 0;

  return (
    <section className="ward-card">
      {/* WARD HEADER */}
      <div className="ward-header">
        <div>
          <p className="small-label">SELECTED WARD</p>
          <h2>{ward.name || `Ward ${ward.ward_id}`}</h2>
        </div>
        <span className={`risk-badge ${getRiskClass(risk)}`}>
          {risk}
        </span>
      </div>

      {/* INFORMATION GRID */}
      <div className="ward-grid">
        {/* CASES */}
        <div className="info-card">
          <div className="info-icon">🦠</div>
          <div>
            <span>Disease Cases</span>
            <strong>{caseCount}</strong>
          </div>
        </div>

        {/* TURBIDITY */}
        <div className="info-card">
          <div className="info-icon">💧</div>
          <div>
            <span>Turbidity</span>
            <strong>
              {water.turbidity ?? ward.turbidity ? `${water.turbidity ?? ward.turbidity} NTU` : "N/A"}
            </strong>
          </div>
        </div>

        {/* PH */}
        <div className="info-card">
          <div className="info-icon">🧪</div>
          <div>
            <span>pH Level</span>
            <strong>{water.ph ?? ward.ph ?? "N/A"}</strong>
          </div>
        </div>

        {/* CONTAMINATION */}
        <div className="info-card">
          <div className="info-icon">⚠️</div>
          <div>
            <span>Contamination</span>
            <strong>
              {water.coliform_detected || ward.contamination_flag
                ? "Detected"
                : "Not Detected"}
            </strong>
          </div>
        </div>
      </div>

      {/* SYMPTOMS */}
      <div className="details-section">
        <h3>Symptom Breakdown</h3>
        <div className="symptoms">
          <div className="symptom">
            <span>Diarrhea</span>
            <strong>{symptoms.diarrhea ?? 0}</strong>
          </div>
          <div className="symptom">
            <span>Vomiting</span>
            <strong>{symptoms.vomiting ?? 0}</strong>
          </div>
          <div className="symptom">
            <span>Fever</span>
            <strong>{symptoms.fever ?? 0}</strong>
          </div>
          <div className="symptom">
            <span>Jaundice</span>
            <strong>{symptoms.jaundice ?? 0}</strong>
          </div>
        </div>
      </div>

      {/* RECOMMENDED ACTION */}
      <div className="action-box">
        <div className="action-icon">⚠️</div>
        <div>
          <h3>Recommended Action</h3>
          <p>
            {details?.recommended_action ||
              ward.recommended_action ||
              "Continue monitoring the ward routine water parameters."}
          </p>
        </div>
      </div>
    </section>
  );
}

export default WardDetails;