import {
  Line
} from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);


function CasesChart() {

  const data = {

    labels: [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun"
    ],

    datasets: [

      {

        label:
          "Disease Cases",

        data: [
          8,
          12,
          18,
          25,
          31,
          37,
          42
        ],

        borderWidth: 3,

        tension: 0.4,

        pointRadius: 4

      }

    ]

  };


  const options = {

    responsive: true,

    maintainAspectRatio: false,

    plugins: {

      legend: {
        display: true
      }

    },

    scales: {

      y: {

        beginAtZero: true

      }

    }

  };


  return (

    <div className="chart-wrapper">

      <Line
        data={data}
        options={options}
      />

    </div>

  );

}


export default CasesChart;