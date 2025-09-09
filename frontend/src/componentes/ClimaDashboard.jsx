import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import { io } from "socket.io-client";

export default function DashboardClima() {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [opalData, setOpalData] = useState([]); // datos para OPAL-RT
  const [dtData, setDtData] = useState([]); // datos para DT
  const MAX_POINTS = 10; // máximo de puntos visibles

  useEffect(() => {
    // conectar socket
    const socket = io("http://172.20.0.137:4000");

    socket.on("connect", () => {
      console.log("Conectado a WebSocket del servidor");
    });

    socket.on("clima_update", (registro) => {
      console.log("Nuevo dato WS:", registro);

      // actualizar gráfico en tiempo real
      setData((prev) => {
        const updated = [...prev, registro];
        if (updated.length > MAX_POINTS) {
          updated.shift();
        }
        return updated;
      });

      // acumular todos los datos históricos en memoria
      setAllData((prev) => [...prev, registro]);
    });

    socket.on("opal_update", (registro) => {
      setOpalData(prev => {
        const updated = [...prev, registro];
        if (updated.length > MAX_POINTS) updated.shift();
        return updated;
      });
    });

    // Datos de DT
    socket.on("dt_update", (registro) => {
      setDtData(prev => {
        const updated = [...prev, registro];
        if (updated.length > MAX_POINTS) updated.shift();
        return updated;
      });
    });

    // limpieza al desmontar el componente
    return () => {
      socket.disconnect();
    };
  }, []);

  const charts = [
    { 
      key: "temperatura", 
      color: "#ef4444", 
      label: "Temperatura", 
      unit: "°C", 
      icon: "🌡️",
      gradient: "linear-gradient(135deg, #ef4444, #f97316)",
      bgGradient: "linear-gradient(135deg, #fef2f2, #fff7ed)"
    },
    { 
      key: "humedad", 
      color: "#3b82f6", 
      label: "Humedad", 
      unit: "%", 
      icon: "💧",
      gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
      bgGradient: "linear-gradient(135deg, #eff6ff, #f0f9ff)"
    },
    { 
      key: "presion", 
      color: "#10b981", 
      label: "Presión", 
      unit: "hPa", 
      icon: "📊",
      gradient: "linear-gradient(135deg, #10b981, #22c55e)",
      bgGradient: "linear-gradient(135deg, #ecfdf5, #f0fdf4)"
    },
    { 
      key: "v_viento", 
      color: "#f59e0b", 
      label: "Vel. Viento", 
      unit: "m/s", 
      icon: "💨",
      gradient: "linear-gradient(135deg, #f59e0b, #eab308)",
      bgGradient: "linear-gradient(135deg, #fffbeb, #fefce8)"
    },
    { 
      key: "d_viento", 
      color: "#6366f1", 
      label: "Dir. Viento", 
      unit: "°", 
      icon: "🧭",
      gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      bgGradient: "linear-gradient(135deg, #eef2ff, #faf5ff)"
    },
    { 
      key: "indiceuv", 
      color: "#a855f7", 
      label: "Índice UV", 
      unit: "", 
      icon: "☀️",
      gradient: "linear-gradient(135deg, #a855f7, #ec4899)",
      bgGradient: "linear-gradient(135deg, #faf5ff, #fdf2f8)"
    }
  ];

  const getCurrentValue = (key) => {
    if (data.length === 0) return "---";
    return data[data.length - 1]?.[key] || "---";
  };

  // Tooltip personalizado
  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '12px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>
            {`Tiempo: ${label}`}
          </p>
          <p style={{ 
            fontWeight: '600', 
            color: payload[0].color,
            margin: 0,
            fontSize: '16px'
          }}>
            {`${payload[0].value} ${payload[0].payload.unit || ''}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '8px',
      background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      margin: '0 0 16px 0'
    },
    subtitle: {
      color: '#cbd5e1',
      fontSize: '16px',
      marginBottom: '16px'
    },
    liveIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '50px',
      padding: '8px 16px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    liveDot: {
      width: '8px',
      height: '8px',
      backgroundColor: '#4ade80',
      borderRadius: '50%',
      animation: 'pulse 2s infinite'
    },
    liveText: {
      color: '#4ade80',
      fontSize: '14px',
      fontWeight: '500'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '24px',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    card: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '24px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    cardContent: {
      position: 'relative',
      padding: '24px',
      zIndex: 2
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px'
    },
    cardLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    iconBox: {
      width: '48px',
      height: '48px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
    },
    cardTitle: {
      color: 'white',
      fontSize: '18px',
      fontWeight: '600',
      margin: 0
    },
    currentValue: {
      textAlign: 'right'
    },
    valueNumber: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: 'white',
      margin: 0
    },
    valueUnit: {
      color: '#cbd5e1',
      fontSize: '14px',
      margin: '4px 0 0 0'
    },
    chartContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '16px',
      backdropFilter: 'blur(5px)'
    },
    cardFooter: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '16px',
      fontSize: '14px'
    },
    footerLeft: {
      color: '#cbd5e1'
    },
    footerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%'
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .dashboard-card {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .dashboard-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          background-color: rgba(255, 255, 255, 0.15);
        }
        
        .dashboard-card:nth-child(1) { animation-delay: 0ms; }
        .dashboard-card:nth-child(2) { animation-delay: 100ms; }
        .dashboard-card:nth-child(3) { animation-delay: 200ms; }
        .dashboard-card:nth-child(4) { animation-delay: 300ms; }
        .dashboard-card:nth-child(5) { animation-delay: 400ms; }
        .dashboard-card:nth-child(6) { animation-delay: 500ms; }
        
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 480px) {
          .dashboard-container {
            padding: 16px;
          }
          .dashboard-title {
            font-size: 2rem;
          }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          Dashboard Climático
        </h1>
        <p style={styles.subtitle}>
          Monitoreo en tiempo real• Ventana deslizante
        </p>
        <div style={styles.liveIndicator}>
          <div style={styles.liveDot}></div>
          <span style={styles.liveText}>En vivo</span>
        </div>
      </div>
      {/* Nueva fila: OPAL-RT y DT */}
      <div style={{ ...styles.grid, justifyContent: "center", marginTop: "2rem" }}>
        
        {/* OPAL-RT */}
        <div style={styles.card} className="dashboard-card">
          <h3 style={styles.cardTitle}>OPAL-RT</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={opalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
              <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} />
              <Tooltip />
              <Line type="monotone" dataKey="valor" stroke="#6b73ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* DT */}
        <div style={{ ...styles.card, marginLeft: "1rem" }} className="dashboard-card">
          <h3 style={styles.cardTitle}>DT</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={dtData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
              <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} />
              <Tooltip />
              <Line type="monotone" dataKey="valor" stroke="#ff6b6b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Dashboard Grid */}
      <div style={styles.grid} className="dashboard-grid">
        {charts.map((chart, index) => (
          <div
            key={chart.key}
            style={styles.card}
            className="dashboard-card"
          >
            {/* Gradient overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: chart.bgGradient,
              opacity: 0.05
            }}></div>
            
            {/* Content */}
            <div style={styles.cardContent}>
              {/* Header con icono y título */}
              <div style={styles.cardHeader}>
                <div style={styles.cardLeft}>
                  <div style={{
                    ...styles.iconBox,
                    background: chart.gradient
                  }}>
                    {chart.icon}
                  </div>
                  <div>
                    <h3 style={styles.cardTitle}>{chart.label}</h3>
                  </div>
                </div>
                
                {/* Valor actual */}
                <div style={styles.currentValue}>
                  <div style={styles.valueNumber}>
                    {getCurrentValue(chart.key)}
                  </div>
                  <div style={styles.valueUnit}>{chart.unit}</div>
                </div>
              </div>

              {/* Gráfico */}
              <div style={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: '#cbd5e1' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#cbd5e1' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    />
                    <Tooltip content={customTooltip} />
                    <Line
                      type="monotone"
                      dataKey={chart.key}
                      stroke={chart.color}
                      strokeWidth={3}
                      dot={{ fill: chart.color, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: chart.color, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Footer con información */}
              <div style={styles.cardFooter}>
                <span style={styles.footerLeft}>
                  Mostrando últimos {Math.min(data.length, 10)} de {allData.length} registros
                </span>
                <div style={styles.footerRight}>
                  <div style={{
                    ...styles.statusDot,
                    background: chart.gradient
                  }}></div>
                  <span style={styles.footerLeft}>Ventana deslizante</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}