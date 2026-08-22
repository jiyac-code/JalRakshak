import { useEffect, useState } from "react";
import RiskMap from "../components/RiskMap";
import WardDetails from "../components/WardDetails";
import CasesChart from "../components/CasesChart";

function Dashboard() {
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/wards/summary")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch ward data");
        }

        return response.json();
      })
      .then((data) => {
        console.log("Ward data:", data);

        setWards(data.wards || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching wards:", error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">
          <div className="loading-icon">💧</div>
          <h2>Loading JalRakshak...</h2>
          <p>Fetching ward risk information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-box">
          <div className="error-icon">⚠️</div>

          <h2>Unable to load dashboard</h2>

          <p>{error}</p>

          <p>
            Make sure the JalRakshak backend is running on
            port 5000.
          </p>
        </div>
      </div>
    );
  }

  const totalCases = wards.reduce(
    (total, ward) => total + Number(ward.case_count || 0),
    0
  );

  const highRiskWards = wards.filter((ward) => {
    const risk = ward.risk_tier?.toUpperCase();

    return risk === "RED" || risk === "ORANGE";
  }).length;

  return (
    <div className="dashboard">

      {/* HEADER */}

      <header className="dashboard-header">

        <div className="logo">

          <div className="logo-icon">
            💧
          </div>

          <div>
            <h1>JalRakshak</h1>

            <p>
              Waterborne Disease Monitoring
            </p>
          </div>

        </div>

        <div className="admin-status">
          <span className="online-dot"></span>

          <span>
            Admin Dashboard
          </span>
        </div>

      </header>


      {/* MAIN CONTENT */}

      <main className="dashboard-content">

        {/* PAGE TITLE */}

        <section className="page-title">

          <div>
            <h2>Admin Dashboard</h2>

            <p>
              Monitor water quality and disease
              risk across wards.
            </p>
          </div>

          <div className="last-updated">
            ● Live Monitoring
          </div>

        </section>


        {/* STATISTICS */}

        <section className="stats">

          <div className="stat-card">

            <div className="stat-icon blue">
              🦠
            </div>

            <div>
              <h3>Total Cases</h3>

              <strong>
                {totalCases}
              </strong>

              <p>
                Reported cases
              </p>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon teal">
              📍
            </div>

            <div>
              <h3>Wards Monitored</h3>

              <strong>
                {wards.length}
              </strong>

              <p>
                Active locations
              </p>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon red">
              ⚠️
            </div>

            <div>
              <h3>High Risk Wards</h3>

              <strong>
                {highRiskWards}
              </strong>

              <p>
                Require attention
              </p>
            </div>

          </div>

        </section>


        {/* MAP */}

        <section className="map-card">

          <div className="map-header">

            <div>
              <h2>
                📍 Community Risk Map
              </h2>

              <p>
                Geographic distribution of
                waterborne disease risk
              </p>
            </div>

            <span className="live-badge">
              ● LIVE
            </span>

          </div>


          <div className="map-container">

            <RiskMap
              wards={wards}
              onWardSelect={setSelectedWard}
            />

          </div>


          {/* LEGEND */}

          <div className="risk-legend">

            <span className="legend-title">
              Risk Level
            </span>

            <span>
              <i className="legend-dot green"></i>
              Low
            </span>

            <span>
              <i className="legend-dot yellow"></i>
              Moderate
            </span>

            <span>
              <i className="legend-dot orange"></i>
              High
            </span>

            <span>
              <i className="legend-dot red"></i>
              Critical
            </span>

          </div>

        </section>


        {/* SELECTED WARD */}

        {selectedWard && (
          <WardDetails
            ward={selectedWard}
          />
        )}


        {/* CHART */}

        <section className="chart-card">

          <div className="section-heading">

            <div>
              <h2>
                📈 Disease Cases Over Time
              </h2>

              <p>
                Reported cases during the
                monitoring period
              </p>
            </div>

          </div>

          <CasesChart />

        </section>

      </main>

    </div>
  );
}

export default Dashboard;