import { useLocation } from 'react-router-dom';

export default function OpalDetalles() {
  const location = useLocation();
  const { opalData, title } = location.state || {};

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>{title || "Detalles de OPAL-RT"}</h1>
      <div>
        <h2>Datos recibidos:</h2>
        <pre>{JSON.stringify(opalData, null, 2)}</pre>
      </div>
    </div>
  );
}