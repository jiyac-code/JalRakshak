import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AdminAssessment from "./pages/AdminAssessment";

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Dashboard Route */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Admin Risk Assessment Route */}
        <Route path="/admin" element={<AdminAssessment />} />
        
        {/* Fallback redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;