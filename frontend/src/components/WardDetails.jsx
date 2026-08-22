import { useEffect, useState } from "react";


function WardDetails({ ward }) {

  const [details, setDetails] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);


  useEffect(() => {

    setLoading(true);
    setError(null);
    setDetails(null);

    fetch(
      `http://localhost:5000/api/wards/${ward.id}/details`
    )

      .then((response) => {

        if (!response.ok) {
          throw new Error(
            "Failed to fetch ward details"
          );
        }

        return response.json();

      })

      .then((data) => {

        console.log(
          "Ward details:",
          data
        );

        setDetails(data);
        setLoading(false);

      })

      .catch((error) => {

        console.error(error);

        setError(error.message);
        setLoading(false);

      });

  }, [ward]);


  const getRiskClass = (risk) => {

    switch (
      risk?.toUpperCase()
    ) {

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


  if (loading) {

    return (

      <section className="ward-card">

        <p>
          Loading ward information...
        </p>

      </section>

    );

  }


  if (error) {

    return (

      <section className="ward-card">

        <h2>
          {ward.name}
        </h2>

        <p className="error-text">
          {error}
        </p>

      </section>

    );

  }


  if (!details) {
    return null;
  }


  const risk =
    details.risk_tier ||
    ward.risk_tier;


  const symptoms =
    details.symptom_breakdown || {};


  const water =
    details.water_metrics || {};


  return (

    <section className="ward-card">

      {/* WARD HEADER */}

      <div className="ward-header">

        <div>

          <p className="small-label">
            SELECTED WARD
          </p>

          <h2>
            {ward.name}
          </h2>

        </div>


        <span
          className={`risk-badge ${getRiskClass(
            risk
          )}`}
        >
          {risk}
        </span>

      </div>


      {/* INFORMATION GRID */}

      <div className="ward-grid">


        {/* CASES */}

        <div className="info-card">

          <div className="info-icon">
            🦠
          </div>

          <div>

            <span>
              Disease Cases
            </span>

            <strong>
              {ward.case_count}
            </strong>

          </div>

        </div>


        {/* TURBIDITY */}

        <div className="info-card">

          <div className="info-icon">
            💧
          </div>

          <div>

            <span>
              Turbidity
            </span>

            <strong>
              {water.turbidity ??
                ward.turbidity ??
                "N/A"}
            </strong>

          </div>

        </div>


        {/* PH */}

        <div className="info-card">

          <div className="info-icon">
            🧪
          </div>

          <div>

            <span>
              pH Level
            </span>

            <strong>
              {water.ph ?? "N/A"}
            </strong>

          </div>

        </div>


        {/* CONTAMINATION */}

        <div className="info-card">

          <div className="info-icon">
            ⚠️
          </div>

          <div>

            <span>
              Contamination
            </span>

            <strong>

              {water.coliform_detected
                ? "Detected"
                : "Not Detected"}

            </strong>

          </div>

        </div>

      </div>


      {/* SYMPTOMS */}

      <div className="details-section">

        <h3>
          Symptom Breakdown
        </h3>

        <div className="symptoms">

          <div className="symptom">

            <span>
              Diarrhea
            </span>

            <strong>
              {symptoms.diarrhea ?? 0}
            </strong>

          </div>


          <div className="symptom">

            <span>
              Vomiting
            </span>

            <strong>
              {symptoms.vomiting ?? 0}
            </strong>

          </div>


          <div className="symptom">

            <span>
              Fever
            </span>

            <strong>
              {symptoms.fever ?? 0}
            </strong>

          </div>


          <div className="symptom">

            <span>
              Jaundice
            </span>

            <strong>
              {symptoms.jaundice ?? 0}
            </strong>

          </div>

        </div>

      </div>


      {/* RECOMMENDED ACTION */}

      <div className="action-box">

        <div className="action-icon">
          ⚠️
        </div>

        <div>

          <h3>
            Recommended Action
          </h3>

          <p>
            {details.recommended_action ||
              "Continue monitoring the ward."}
          </p>

        </div>

      </div>

    </section>

  );

}

export default WardDetails;