import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ClimaDashboard from "./componentes/ClimaDashboard";
import OpalDetalles from "./componentes/OPALRT_Detalle";
import tempDetalles from "./componentes/TempDetalles";
import humDetalles from "./componentes/HumDetalles.jsx";
import presDetalles from "./componentes/PresDetalles";
import vvDetalles from "./componentes/VvDetalles";
import dvDetalles from "./componentes/DvDetalles";
import uvDetalles from "./componentes/UvDetalles";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/clima" element={<ClimaDashboard />} />
        <Route path="/OPALRT_Detalle" element={<OpalDetalles />} />
        <Route path="/detalles/temperatura" element={<tempDetalles />} />
        <Route path="/detalles/humedad" element={<humDetalles />} />
        <Route path="/detalles/presion" element={<presDetalles />} />
        <Route path="/detalles/v_viento" element={<vvDetalles />} />
        <Route path="/detalles/d_viento" element={<dvDetalles />} />
        <Route path="/detalles/indiceuv" element={<uvDetalles />} />
        <Route path="*" element={<ClimaDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
