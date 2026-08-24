import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components including Filler for gradient support
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// Default fallback data if backend endpoint is unavailable
const FALLBACK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FALLBACK_CASES = [8, 12, 18, 25, 31, 37, 42];

function CasesChart({ chartData }) {
  const [labels, setLabels] = useState(FALLBACK_LABELS);
  const [cases, setCases] = useState(FALLBACK_CASES);
  const [loading, setLoading] = useState(!chartData);

  useEffect(() => {
    // If data is passed as props from Dashboard, use it directly
    if (chartData) {
      setLabels(chartData.labels || FALLBACK_LABELS);
      setCases(chartData.cases || FALLBACK_CASES);
      setLoading(false);
      return;
    }

    // Otherwise, fetch time-series historical data from backend API
    fetch(`${API_BASE}/api/cases/trend`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch case trends");
        return res.json();
      })
      .then((data) => {
        if (data.labels && data.cases) {
          setLabels(data.labels);
          setCases(data.cases);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Using fallback trend data:", err.message);
        setLoading(false);
      });
  }, [chartData]);

  const data = {
    labels: labels,
    datasets: [
      {
        label: "Disease Cases",
        data: cases,
        borderColor: "#0284c7", // Accent Blue
        backgroundColor: "rgba(2, 132, 199, 0.1)", // Smooth gradient area fill
        fill: true,
        borderWidth: 3,
        tension: 0.4, // Curved line
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#0284c7",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#475569",
          font: {
            size: 12,
            weight: "600",
          },
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#f8fafc",
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#64748b",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(226, 232, 240, 0.6)",
        },
        ticks: {
          color: "#64748b",
          precision: 0,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="chart-wrapper" style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b" }}>Loading disease trend charts...</p>
      </div>
    );
  }

  return (
    <div className="chart-wrapper" style={{ position: "relative", height: "300px", width: "100%" }}>
      <Line data={data} options={options} />
    </div>
  );
}

export default CasesChart;