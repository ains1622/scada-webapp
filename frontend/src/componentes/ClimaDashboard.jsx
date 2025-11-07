import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";


const SOCKET_URL = "http://localhost:4000";

export default function DashboardClima() {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [opalData, setOpalData] = useState([]);
  const [dtData, setDtData] = useState([]);
  const [opalChartMode, setOpalChartMode] = useState('potencia-tiempo');
  const MAX_POINTS = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    const mounted = { current: true };

    // Helper para normalizar puntos con timestamp
    const makePoint = (payload) => {
      // Si payload ya contiene timestamp, úsalo; si no, crea uno
      return {
        timestamp: payload.timestamp || new Date().toISOString(),
        ...payload
      };
    };

    // Maneja actualizaciones de clima (principal)
    const onClima = (payload) => {
      if (!mounted.current) return;
      const point = makePoint(payload);
      setData(prev => {
        const next = [...prev, point].slice(-MAX_POINTS);
        return next;
      });
      setAllData(prev => [...prev, point]);
    };

    // Maneja actualizaciones de OPAL
    const onOpal = (payload) => {
      if (!mounted.current) return;
      const point = makePoint(payload);
      setOpalData(prev => {
        const next = [...prev, point].slice(-MAX_POINTS);
        return next;
      });
    };

    // Maneja actualizaciones de DT
    const onDt = (payload) => {
      if (!mounted.current) return;
      const point = makePoint(payload);
      setDtData(prev => {
        const next = [...prev, point].slice(-MAX_POINTS);
        return next;
      });
    };

    // Eventos del socket (nombres puros; ajusta si tu servidor usa otros)
    socket.on('connect', () => {
      console.debug('socket conectado', socket.id);
    });

    // Compatibilidad con eventos emitidos por el backend (consumer usa 'clima_update')
    socket.on('clima', onClima);
    socket.on('clima:update', onClima);
    socket.on('clima_update', onClima);
    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err);
    });
    socket.on('opal', onOpal);
    socket.on('opal:update', onOpal);
    socket.on('dt', onDt);
    socket.on('dt:update', onDt);

    // Evento inicial que puede traer snapshot de datos
    socket.on('initial', (payload = {}) => {
      if (!mounted.current) return;
      if (payload.clima && Array.isArray(payload.clima)) {
        setAllData(payload.clima);
        setData(payload.clima.slice(-MAX_POINTS));
      }
      if (payload.opal && Array.isArray(payload.opal)) {
        setOpalData(payload.opal.slice(-MAX_POINTS));
      }
      if (payload.dt && Array.isArray(payload.dt)) {
        setDtData(payload.dt.slice(-MAX_POINTS));
      }
    });

    // Limpieza
    return () => {
      mounted.current = false;
      socket.off('clima', onClima);
      socket.off('clima:update', onClima);
      socket.off('opal', onOpal);
      socket.off('opal:update', onOpal);
      socket.off('dt', onDt);
      socket.off('dt:update', onDt);
      socket.off('initial');
      socket.disconnect();
    };
  }, []);

  const handleCardClick = (chartKey) => {
    navigate(`/${chartKey}`, { state: { data: allData, metric: chartKey } });
  };
  const handleOpalClick = () => {
    navigate('/OPALRT_Detalle', { state: { opalData: opalData, title: "Detalles de OPAL-RT" } });
  };
  const handleDtClick = () => {
    navigate('/DT_Detalle', { state: { dtData: dtData, title: "Detalles de Digital Twin" } });
  };
  const handleHomeClick = () => {
    navigate('/');
  };

  const getOpalChartConfig = () => {
    switch(opalChartMode) {
      case 'potencia-tiempo': return { xKey: 'timestamp', yKey: 'potencia', xLabel: 'Tiempo', yLabel: 'Potencia (W)', color: '#6b73ff', title: 'Potencia vs Tiempo' };
      case 'corriente-voltaje': return { xKey: 'voltaje', yKey: 'corriente', xLabel: 'Voltaje (V)', yLabel: 'Corriente (A)', color: '#22c55e', title: 'Corriente vs Voltaje' };
      case 'potencia-voltaje': return { xKey: 'voltaje', yKey: 'potencia', xLabel: 'Voltaje (V)', yLabel: 'Potencia (W)', color: '#f59e0b', title: 'Potencia vs Voltaje' };
      default: return { xKey: 'timestamp', yKey: 'potencia', xLabel: 'Tiempo', yLabel: 'Potencia (W)', color: '#6b73ff', title: 'Potencia vs Tiempo' };
    }
  };

  const charts = [
    { key: "temperatura", color: "#ef4444", label: "Temperatura", unit: "°C", icon: "🌡️", gradient: "linear-gradient(135deg, #ef4444, #f97316)", bgGradient: "linear-gradient(135deg, #fef2f2, #fff7ed)" },
    { key: "humedad", color: "#3b82f6", label: "Humedad", unit: "%", icon: "💧", gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)", bgGradient: "linear-gradient(135deg, #eff6ff, #f0f9ff)" },
    { key: "presion", color: "#10b981", label: "Presión", unit: "hPa", icon: "📊", gradient: "linear-gradient(135deg, #10b981, #22c55e)", bgGradient: "linear-gradient(135deg, #ecfdf5, #f0fdf4)" },
    { key: "v_viento", color: "#f59e0b", label: "Vel. Viento", unit: "m/s", icon: "💨", gradient: "linear-gradient(135deg, #f59e0b, #eab308)", bgGradient: "linear-gradient(135deg, #fffbeb, #fefce8)" },
    { key: "d_viento", color: "#6366f1", label: "Dir. Viento", unit: "°", icon: "🧭", gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)", bgGradient: "linear-gradient(135deg, #eef2ff, #faf5ff)" },
    { key: "indiceuv", color: "#a855f7", label: "Índice UV", unit: "", icon: "☀️", gradient: "linear-gradient(135deg, #a855f7, #ec4899)", bgGradient: "linear-gradient(135deg, #faf5ff, #fdf2f8)" }
  ];

  const getCurrentValue = (key) => {
    if (data.length === 0) return "---";
    return data[data.length - 1]?.[key] || "---";
  };

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
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>{`${getOpalChartConfig().xLabel}: ${label}`}</p>
          <p style={{ fontWeight: '600', color: payload[0].color, margin: 0, fontSize: '16px' }}>{`${getOpalChartConfig().yLabel}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  const climaTooltip = ({ active, payload, label }) => {
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
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>{`Tiempo: ${label}`}</p>
          <p style={{ fontWeight: '600', color: payload[0].color, margin: 0, fontSize: '16px' }}>{`${payload[0].value} ${payload[0].payload.unit || ''}`}</p>
        </div>
      );
    }
    return null;
  };

  const styles = {
    container: {
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)',
      padding: '0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    logo: {
      color: 'white',
      fontSize: '20px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    homeButton: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    alertsContainer: {
      display: 'flex',
      gap: '12px'
    },
    alertCard: {
      padding: '8px 12px',
      borderRadius: '8px',
      backgroundColor: '#ef4444',
      color: 'white',
      fontSize: '12px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    mainContent: {
      flex: 1,
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    },
    topMetrics: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      justifyContent: 'center',
      flexWrap: 'wrap'
    },
    metricCard: {
      padding: '12px 16px',
      borderRadius: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: '120px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    metricValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: 'white'
    },
    metricLabel: {
      fontSize: '12px',
      color: '#cbd5e1'
    },
    centralCards: {
      display: 'flex',
      gap: '24px',
      justifyContent: 'center',
      alignItems: 'center',
      maxWidth: '1400px',
      width: '100%'
    },
    systemCard: {
      width: '45%',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '24px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      padding: '24px'
    },
    systemHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px'
    },
    systemHeaderLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    systemIcon: {
      width: '56px',
      height: '56px',
      borderRadius: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)'
    },
    systemTitle: {
      color: 'white',
      fontSize: '24px',
      fontWeight: '700',
      margin: 0
    },
    systemSubtitle: {
      color: '#cbd5e1',
      fontSize: '14px',
      margin: '4px 0 0 0'
    },
    systemChartContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      padding: '20px',
      backdropFilter: 'blur(5px)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
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
    },
    modeSelector: {
      display: 'flex',
      gap: '8px',
      marginBottom: '16px'
    },
    modeButton: {
      padding: '8px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: '#cbd5e1',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backdropFilter: 'blur(5px)'
    },
    modeButtonActive: {
      padding: '8px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(107, 115, 255, 0.5)',
      backgroundColor: 'rgba(107, 115, 255, 0.2)',
      color: '#6b73ff',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backdropFilter: 'blur(5px)',
      fontWeight: '600'
    },
    chartTitle: {
      color: 'white',
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '12px',
      textAlign: 'center'
    }
  };

  const opalConfig = getOpalChartConfig();

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-card { animation: fadeInUp 0.6s ease-out forwards; }
        .dashboard-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); background-color: rgba(255, 255, 255, 0.15); }
        .mode-button:hover { background-color: rgba(255, 255, 255, 0.1); transform: translateY(-2px); }
        .metric-card:hover { transform: translateY(-4px); background-color: rgba(255, 255, 255, 0.15); }
      `}</style>

      {/* Header fijo */}
      <div style={styles.header}>
        <button style={styles.homeButton} onClick={handleHomeClick}>🏠 Home</button>
        <div style={styles.logo}>🔧 SCADA Dashboard</div>
        <div style={styles.alertsContainer}>
          <div style={styles.alertCard}>⚠️ Temperatura sobre 35°C</div>
          <div style={styles.alertCard}>⚠️ Humedad crítica</div>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={styles.mainContent}>
        {/* Métricas climáticas puntuales */}
        <div style={styles.topMetrics}>
          {charts.map((chart) => (
            <div
              key={chart.key}
              style={styles.metricCard}
              className="metric-card"
              onClick={() => handleCardClick(chart.key)}
            >
              <div style={styles.metricValue}>{getCurrentValue(chart.key)}</div>
              <div style={styles.metricLabel}>{chart.label}</div>
            </div>
          ))}
        </div>

        {/* Cards centrales: OPAL-RT y DT */}
        <div style={styles.centralCards}>
          {/* OPAL-RT */}
          <div style={styles.systemCard} className="dashboard-card">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', opacity: 0.05 }}></div>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={styles.systemHeader}>
                <div style={styles.systemHeaderLeft}>
                  <div style={{ ...styles.systemIcon, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>🖥️</div>
                  <div>
                    <h3 style={styles.systemTitle}>OPAL-RT</h3>
                    <p style={styles.systemSubtitle}>Sistema de simulación en tiempo real</p>
                  </div>
                </div>
                <button onClick={handleOpalClick} style={styles.homeButton}>Ver Detalles</button>
              </div>
              <div style={styles.modeSelector}>
                <button className="mode-button" style={opalChartMode === 'potencia-tiempo' ? styles.modeButtonActive : styles.modeButton} onClick={() => setOpalChartMode('potencia-tiempo')}>Potencia vs Tiempo</button>
                <button className="mode-button" style={opalChartMode === 'corriente-voltaje' ? styles.modeButtonActive : styles.modeButton} onClick={() => setOpalChartMode('corriente-voltaje')}>Corriente vs Voltaje</button>
                <button className="mode-button" style={opalChartMode === 'potencia-voltaje' ? styles.modeButtonActive : styles.modeButton} onClick={() => setOpalChartMode('potencia-voltaje')}>Potencia vs Voltaje</button>
              </div>
              <div style={styles.chartTitle}>{opalConfig.title}</div>
              <div style={styles.systemChartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={opalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey={opalConfig.xKey} tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    <Tooltip content={customTooltip} />
                    <Line type="monotone" dataKey={opalConfig.yKey} stroke={opalConfig.color} strokeWidth={3} dot={{ fill: opalConfig.color, strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: opalConfig.color, strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.footerLeft}>Últimos {Math.min(opalData.length, 10)} puntos</span>
                <div style={styles.footerRight}>
                  <div style={{ ...styles.statusDot, background: opalConfig.color }}></div>
                  <span style={styles.footerLeft}>Sistema activo</span>
                </div>
              </div>
            </div>
          </div>

          {/* DT */}
          <div style={styles.systemCard} className="dashboard-card" onClick={handleDtClick}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, #ef4444, #f97316)', opacity: 0.05 }}></div>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={styles.systemHeader}>
                <div style={styles.systemHeaderLeft}>
                  <div style={{ ...styles.systemIcon, background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>🔗</div>
                  <div>
                    <h3 style={styles.systemTitle}>DT</h3>
                    <p style={styles.systemSubtitle}>Digital Twin en tiempo real</p>
                  </div>
                </div>
              </div>
              <div style={styles.systemChartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dtData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    <Tooltip content={climaTooltip} />
                    <Line type="monotone" dataKey="valor" stroke="#ff6b6b" strokeWidth={3} dot={{ fill: '#ff6b6b', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#ff6b6b', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.footerLeft}>Últimos {Math.min(dtData.length, 10)} puntos</span>
                <div style={styles.footerRight}>
                  <div style={{ ...styles.statusDot, background: 'linear-gradient(135deg, #ef4444, #f97316)' }}></div>
                  <span style={styles.footerLeft}>Sincronizado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
