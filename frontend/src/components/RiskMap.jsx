import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";


function getColor(risk) {

  switch (risk?.toUpperCase()) {

    case "GREEN":
      return "green";

    case "YELLOW":
      return "yellow";

    case "ORANGE":
      return "orange";

    case "RED":
      return "red";

    default:
      return "gray";
  }
}


function RiskMap({ wards, onWardSelect }) {

  return (

    <MapContainer
      center={[19.03, 72.85]}
      zoom={12}
      scrollWheelZoom={true}
      className="leaflet-map"
    >

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />


      {wards.map((ward) => {

        const color =
          getColor(ward.risk_tier);

        return (

          <CircleMarker

            key={ward.id}

            center={[
              ward.lat,
              ward.lng
            ]}

            radius={16}

            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.75,
              weight: 3
            }}

            eventHandlers={{
              click: () => {
                onWardSelect(ward);
              }
            }}

          >

            <Popup>

              <div className="map-popup">

                <h3>
                  {ward.name}
                </h3>

                <p>
                  <strong>
                    Risk:
                  </strong>{" "}
                  {ward.risk_tier}
                </p>

                <p>
                  <strong>
                    Cases:
                  </strong>{" "}
                  {ward.case_count}
                </p>

                <p>
                  <strong>
                    Turbidity:
                  </strong>{" "}
                  {ward.turbidity}
                </p>

                <button
                  onClick={() =>
                    onWardSelect(ward)
                  }
                >
                  View Details
                </button>

              </div>

            </Popup>

          </CircleMarker>

        );

      })}

    </MapContainer>

  );
}

export default RiskMap;