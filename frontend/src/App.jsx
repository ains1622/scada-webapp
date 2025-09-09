import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ClimaDashboard from "./componentes/ClimaDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/clima" element={<ClimaDashboard />} />
        {/* aquí puedes agregar más rutas en el futuro */}
      </Routes>
    </Router>
  );
}

export default App;
