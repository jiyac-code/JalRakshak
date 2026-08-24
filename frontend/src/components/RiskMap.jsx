import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const RiskMap = ({ wards, onWardSelect }) => {
  const defaultCenter = [19.2183, 72.9781]; // Default center (Thane area)

  const getRiskColor = (tier) => {
    switch (tier?.toUpperCase()) {
      case "RED": return "#ef4444";
      case "ORANGE": return "#f97316";
      case "YELLOW": return "#eab308";
      case "GREEN": return "#22c55e";
      default: return "#cbd5e1";
    }
  };

  return (
    <MapContainer center={defaultCenter} zoom={12} style={{ height: "400px", width: "100%", borderRadius: "10px" }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      {wards.map((ward) => (
        <CircleMarker
          key={ward.ward_id}
          center={[ward.lat, ward.lng]}
          radius={12}
          pathOptions={{ 
            color: getRiskColor(ward.risk_tier), 
            fillColor: getRiskColor(ward.risk_tier), 
            fillOpacity: 0.7 
          }}
          eventHandlers={{
            click: () => onWardSelect(ward),
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            <strong>{ward.name}</strong>
            <br />
            Risk: {ward.risk_tier}
          </Tooltip>
          <Popup>
            <strong>{ward.name}</strong>
            <br />
            Cases: {ward.total_reported_cases}
            <br />
            Turbidity: {ward.turbidity} NTU
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default RiskMap;