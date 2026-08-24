import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import RiskMap from "../components/RiskMap";
import WardDetails from "../components/WardDetails";
import CasesChart from "../components/CasesChart";
import { AlertBell, AlertDrawer, processWardAlerts } from "../components/alertsys";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const socket = io(SOCKET_URL);

function Dashboard() {
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchWardSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/api/wards/summary`);
      if (!response.ok) throw new Error("Failed to load ward data.");
      const data = await response.json();
      const list = data.wards || [];
      
      setWards(list);
      setAlerts((prev) => processWardAlerts(list, prev));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardSummary();

    // Real-time Socket.IO listeners
    socket.on("new_report_added", fetchWardSummary);
    socket.on("report_status_updated", fetchWardSummary);

    return () => {
      socket.off("new_report_added", fetchWardSummary);
      socket.off("report_status_updated", fetchWardSummary);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">
          <div className="loading-icon">💧</div>
          <h2>Loading JalRakshak...</h2>
          <p>Fetching real-time risk data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-box">
          <div className="error-icon">⚠️</div>
          <h2>Dashboard Offline</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchWardSummary}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const totalCases = wards.reduce((acc, ward) => acc + Number(ward.total_reported_cases || ward.case_count || 0), 0);
  const highRiskWards = wards.filter((w) => ["RED", "ORANGE"].includes(w.risk_tier?.toUpperCase())).length;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="logo">
          <div className="logo-icon">💧</div>
          <div>
            <h1>JalRakshak</h1>
            <p>Waterborne Disease Monitoring</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <AlertBell count={alerts.length} onClick={() => setIsDrawerOpen(true)} />
          <div className="admin-status">
            <span className="online-dot"></span>
            <span>Admin Dashboard</span>
          </div>
        </div>
      </header>

      <AlertDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        alerts={alerts}
        onClear={() => setAlerts([])}
      />

      <main className="dashboard-content">
        <section className="page-title">
          <div>
            <h2>Admin Dashboard</h2>
            <p>Monitor water quality and disease risk across wards.</p>
          </div>
          <div className="last-updated">● Live Monitoring</div>
        </section>

        {/* Summary Statistics */}
        <section className="stats">
          <div className="stat-card">
            <div className="stat-icon blue">🦠</div>
            <div>
              <h3>Total Cases</h3>
              <strong>{totalCases}</strong>
              <p>Reported cases</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon teal">📍</div>
            <div>
              <h3>Wards Monitored</h3>
              <strong>{wards.length}</strong>
              <p>Active locations</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">⚠️</div>
            <div>
              <h3>High Risk Wards</h3>
              <strong>{highRiskWards}</strong>
              <p>Require attention</p>
            </div>
          </div>
        </section>

        {/* Community Risk Map */}
        <section className="map-card">
          <div className="map-header">
            <div>
              <h2>📍 Community Risk Map</h2>
              <p>Geographic distribution of waterborne disease risk</p>
            </div>
            <span className="live-badge">● LIVE</span>
          </div>
          <div className="map-container">
            <RiskMap wards={wards} onWardSelect={(ward) => setSelectedWard(ward)} />
          </div>
          <div className="risk-legend">
            <span className="legend-title">Risk Level</span>
            <span><i className="legend-dot green"></i> Low</span>
            <span><i className="legend-dot yellow"></i> Moderate</span>
            <span><i className="legend-dot orange"></i> High</span>
            <span><i className="legend-dot red"></i> Critical</span>
          </div>
        </section>

        {/* Selected Ward Details Section */}
        {selectedWard && <WardDetails ward={selectedWard} />}

        {/* Historical Disease Trend Chart */}
        <section className="chart-card">
          <div className="section-heading">
            <div>
              <h2>📈 Disease Cases Over Time</h2>
              <p>Reported cases during the monitoring period</p>
            </div>
          </div>
          <CasesChart />
        </section>
      </main>
    </div>
  );
}

export default Dashboard;