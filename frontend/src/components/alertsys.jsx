import React from "react";

/**
 * Utility function to process incoming ward data and generate SMS/Alert logs.
 * Supports flexible ward ID properties (ward.ward_id || ward.id) and case-insensitive risk tiers.
 */
export function processWardAlerts(wardsList = [], currentAlerts = []) {
  const newAlerts = [...currentAlerts];

  wardsList.forEach((ward) => {
    const rawTier = ward.risk_tier ? String(ward.risk_tier) : "";
    const tierUpper = rawTier.toUpperCase();

    if (tierUpper === "RED" || tierUpper === "ORANGE") {
      const wardId = ward.ward_id || ward.id || "unknown";
      // Form a clean title-cased tier for display (e.g., "Red", "Orange")
      const formattedTier = rawTier.charAt(0).toUpperCase() + rawTier.slice(1).toLowerCase();
      
      const alertId = `ward-${wardId}-${formattedTier}`;
      const alreadyExists = newAlerts.some((a) => a.id === alertId);

      if (!alreadyExists) {
        const generatedAlert = {
          id: alertId,
          tier: formattedTier,
          ward_id: wardId,
          recipient: `Ward ${wardId} Health Officer`,
          title: `🚨 ${formattedTier.toUpperCase()} RISK: ${ward.name || `Ward ${wardId}`}`,
          message: ward.recommended_action || "High water contamination or case surge detected.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        
        newAlerts.unshift(generatedAlert);
        console.log(`[MOCK SMS SENT]: ${generatedAlert.title} -> Dispatched to ${generatedAlert.recipient}`);
      }
    }
  });

  return newAlerts;
}

/**
 * Navigation header bell button with dynamic count badge.
 */
export function AlertBell({ count, onClick }) {
  return (
    <button onClick={onClick} style={bellButtonStyle} title="View Alert Logs">
      <span style={{ fontSize: "18px" }}>🔔</span>
      {count > 0 && <span style={badgeStyle}>{count > 99 ? "99+" : count}</span>}
    </button>
  );
}

/**
 * Sliding notification drawer for reviewing active risk alerts and mock SMS logs.
 */
export function AlertDrawer({ isOpen, onClose, alerts = [], onClear }) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={drawerStyle}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🔔</span>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>Alert Logs & SMS</h3>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: "40px", color: "#94a3b8" }}>
              <p style={{ fontSize: "24px", margin: "0 0 8px 0" }}>🔕</p>
              <p style={{ fontSize: "13px" }}>No active risk alerts logged.</p>
            </div>
          ) : (
            alerts.map((item) => (
              <div key={item.id} style={getCardStyle(item.tier)}>
                <div style={metaRowStyle}>
                  <span><strong>To:</strong> {item.recipient}</span>
                  <span>{item.timestamp}</span>
                </div>
                <h4 style={titleStyle}>{item.title}</h4>
                <p style={messageStyle}>{item.message}</p>
                <div style={statusTagStyle}>✓ Mock SMS Dispatched to Health Dept</div>
              </div>
            ))
          )}
        </div>

        {alerts.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <button onClick={onClear} style={clearBtnStyle}>Clear Alert History</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Component Styles ---
const bellButtonStyle = { position: "relative", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const badgeStyle = { position: "absolute", top: "-5px", right: "-5px", background: "#ef4444", color: "#ffffff", fontSize: "10px", fontWeight: "bold", borderRadius: "10px", padding: "2px 6px", border: "2px solid #ffffff" };
const overlayStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", zIndex: 2000, backdropFilter: "blur(2px)" };
const drawerStyle = { position: "fixed", top: 0, right: 0, bottom: 0, width: "340px", maxWidth: "90vw", background: "#ffffff", display: "flex", flexDirection: "column", boxShadow: "-4px 0 25px rgba(0, 0, 0, 0.15)", zIndex: 2100 };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" };
const closeBtnStyle = { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" };
const metaRowStyle = { display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "6px" };
const titleStyle = { margin: "0 0 4px 0", fontSize: "13px", fontWeight: "700", color: "#0f172a" };
const messageStyle = { margin: 0, fontSize: "12px", color: "#334155", lineHeight: "1.4" };
const statusTagStyle = { marginTop: "8px", fontSize: "10px", color: "#16a34a", fontWeight: "600" };
const clearBtnStyle = { width: "100%", padding: "8px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "#475569" };

const getCardStyle = (tier) => {
  const normalizedTier = tier ? tier.toLowerCase() : "";
  const borderColor = normalizedTier === "red" ? "#ef4444" : normalizedTier === "orange" ? "#f97316" : "#eab308";
  const bgColor = normalizedTier === "red" ? "#fef2f2" : normalizedTier === "orange" ? "#fff7ed" : "#fefce8";

  return {
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
    borderLeft: `4px solid ${borderColor}`,
    backgroundColor: bgColor,
  };
};