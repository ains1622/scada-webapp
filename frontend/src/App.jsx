import React from "react";
import { RecoilRoot } from 'recoil';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ClimaDashboard from "./componentes/ClimaDashboard";
import OpalDetalles from "./componentes/OPALRT_Detalle";
import ParametroDetalles from "./componentes/ParametroDetalles";


function App() {
  return (
    <RecoilRoot>
    <Router>
      <Routes>
        <Route path="/clima" element={<ClimaDashboard />} />
        <Route path="/OPALRT_Detalle" element={<OpalDetalles />} />
        {/* Rutas para cada parámetro meteorológico */}
          <Route 
            path="/temperatura" 
            element={
              <ParametroDetalles 
                parametro="temperatura" 
                title="Análisis Detallado de Temperatura" 
              />
            } 
          />
          
          <Route 
            path="/humedad" 
            element={
              <ParametroDetalles 
                parametro="humedad" 
                title="Análisis Detallado de Humedad" 
              />
            } 
          />
          
          <Route 
            path="/presion" 
            element={
              <ParametroDetalles 
                parametro="presion" 
                title="Análisis Detallado de Presión Atmosférica" 
              />
            } 
          />
          
          <Route 
            path="/v_viento" 
            element={
              <ParametroDetalles 
                parametro="v_viento" 
                title="Análisis Detallado de Velocidad del Viento" 
              />
            } 
          />
          
          <Route 
            path="/d_viento" 
            element={
              <ParametroDetalles 
                parametro="d_viento" 
                title="Análisis Detallado de Dirección del Viento" 
              />
            } 
          />
       
          <Route 
            path="/indiceuv" 
            element={
              <ParametroDetalles 
                parametro="indiceuv" 
                title="Análisis Detallado de Índice UV" 
              />
            } 
          />
        <Route path="*" element={<ClimaDashboard />} />
      </Routes>
    </Router>
    </RecoilRoot>
  );
}
export default App;
