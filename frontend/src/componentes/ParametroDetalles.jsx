import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Filter, Calendar, TrendingUp, BarChart3, Activity, Download, Settings, RefreshCw, ArrowLeft, Eye, EyeOff, Thermometer, TrendingDown, AlertTriangle, Zap, Gauge, Wind, Navigation, Sun, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function ParametroDetalles({ datas, title, parametro }) {
  // Estados para filtros y configuración
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [chartType, setChartType] = useState('line');
  const [timeAggregation, setTimeAggregation] = useState('hour');
  const [showFilters, setShowFilters] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showStats, setShowStats] = useState(['actual', 'minMax', 'promedio']);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alertThresholds, setAlertThresholds] = useState(() => {
    // Valores por defecto según el parámetro
    const defaults = {
      humedad: { min: 30, max: 80 },
      presion: { min: 980, max: 1050 },
      velocidad_viento: { min: 0, max: 50 },
      direccion_viento: { min: 0, max: 360 },
      indice_uv: { min: 0, max: 11 },
      temperatura: { min: 10, max: 35 }
    };
    return defaults[parametro] || defaults.temperatura;
  });
  const navigate = useNavigate();
  const handleVolver = () => {
    navigate('/clima');
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (dateRange.start) queryParams.append('start', dateRange.start);
        if (dateRange.end) queryParams.append('end', dateRange.end);

        const response = await fetch(`/clima?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error('Error al cargar los datos');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange.start, dateRange.end]);

  // Configuración específica para cada parámetro
  const parametroConfig = useMemo(() => {
    const configs = {
      humedad: {
        unidad: '%',
        color: '#3b82f6',
        icono: Droplets,
        nombreCompleto: 'Humedad Relativa',
        rangosNormales: '30-80%',
        metricaPrincipal: 'humedad',
      },
      presion: {
        unidad: ' hPa',
        color: '#8b5cf6',
        icono: Gauge,
        nombreCompleto: 'Presión Atmosférica',
        rangosNormales: '980-1050 hPa',
        metricaPrincipal: 'presion',
      },
      v_viento: {
        unidad: ' km/h',
        color: '#06b6d4',
        icono: Wind,
        nombreCompleto: 'Velocidad del Viento',
        rangosNormales: '0-50 km/h',
        metricaPrincipal: 'v_viento',
      },
      d_viento: {
        unidad: '°',
        color: '#ec4899',
        icono: Navigation,
        nombreCompleto: 'Dirección del Viento',
        rangosNormales: '0-360°',
        metricaPrincipal: 'd_viento',
      },
      indiceuv: {
        unidad: '',
        color: '#eab308',
        icono: Sun,
        nombreCompleto: 'Índice Ultravioleta',
        rangosNormales: '0-11',
        metricaPrincipal: 'indiceuv',
      },
      temperatura: {
        unidad: '°C',
        color: '#ef4444',
        icono: Thermometer,
        nombreCompleto: 'Temperatura',
        rangosNormales: '10-35°C',
        metricaPrincipal: 'temperatura',
      }
    };
    return configs[parametro] || configs.temperatura;
  }, [parametro]);
  const IconoParametro = parametroConfig.icono;
  // Datos de ejemplo para demostración (en caso de que no haya datos)
  const sampleData = useMemo(() => {
    if (data && Array.isArray(data)) return data;
    
    // Generar datos de ejemplo con patrones realistas según el parámetro
    const now = new Date();
    return Array.from({ length: 200 }, (_, i) => {
      const date = new Date(now.getTime() - (200 - i) * 60 * 60 * 1000);
      const hourOfDay = date.getHours();
      
      let valorPrincipal;
      
      // Patrones específicos para cada parámetro
      switch(parametro) {
        case 'humedad':
          const dailyPatternHumedad = 60 - Math.sin((hourOfDay - 6) * Math.PI / 12) * 20;
          valorPrincipal = dailyPatternHumedad + Math.sin(i * 0.03) * 10 + (Math.random() * 6 - 3);
          break;
          
        case 'presion':
          valorPrincipal = 1015 + Math.sin(i * 0.05) * 15 + (Math.random() * 4 - 2);
          break;
          
        case 'v_viento':
          const baseViento = 10 + Math.sin(i * 0.1) * 8;
          valorPrincipal = baseViento + Math.random() * 5;
          break;
          
        case 'd_viento':
          valorPrincipal = (Math.sin(i * 0.05) * 180 + 180) % 360;
          break;
          
        case 'indiceuv':
          const uvPattern = 5 + Math.sin((hourOfDay - 12) * Math.PI / 12) * 4;
          valorPrincipal = Math.max(0, uvPattern + Math.sin(i * 0.02) * 2 + (Math.random() * 1.5 - 0.75));
          break;
          
        default: // temperatura
          const dailyPattern = 25 + Math.sin((hourOfDay - 6) * Math.PI / 12) * 8;
          const seasonal = Math.sin(i * 0.02) * 3;
          valorPrincipal = dailyPattern + seasonal + (Math.random() * 4 - 2);
      }
      
      return {
        timestamp: date.toISOString(),
        time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        date: date.toLocaleDateString('es-ES'),
        fullDate: date.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        // sólo la métrica principal
        [parametroConfig.metricaPrincipal]: Math.round(valorPrincipal * 100) / 100,
        isAlert: parametro === 'direccion_viento' 
          ? false
          : valorPrincipal < alertThresholds.min || valorPrincipal > alertThresholds.max
      };
    });
  }, [data, parametro, alertThresholds, parametroConfig]);
  // Filtrar datos según criterios
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    let filtered = [...data];

    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= start && itemDate <= end;
      });
    }

    return filtered;
  }, [data, dateRange]);
  // Cálculos estadísticos
  const stats = useMemo(() => {
    if (!filteredData.length) return {};
    
    const valores = filteredData.map(d => d[parametroConfig.metricaPrincipal]);
    const current = valores[valores.length - 1];
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const avg = valores.reduce((a, b) => a + b, 0) / valores.length;
    const alerts = filteredData.filter(d => d.isAlert).length;
    
    // Tendencia (últimos 10 vs anteriores 10)
    const recent = valores.slice(-10);
    const previous = valores.slice(-20, -10);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    const trend = recentAvg - previousAvg;
    
    return {
      current,
      min,
      max,
      avg,
      alerts,
      trend,
      range: max - min
    };
  }, [filteredData, parametroConfig]);
  // Tooltip personalizado
  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: '200px'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0', fontWeight: '500' }}>
            {data.fullDate} - {label}
          </p>
          {payload.map((entry, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <p style={{ 
                fontWeight: '600', 
                color: entry.color,
                margin: 0,
                fontSize: '16px'
              }}>
                {entry.name}: {entry.value.toFixed(1)}{parametroConfig.unidad}
              </p>
            </div>
          ))}
          {data.isAlert && (
            <div style={{ 
              marginTop: '8px', 
              padding: '4px 8px', 
              backgroundColor: '#fef2f2', 
              borderRadius: '6px',
              border: '1px solid #fecaca'
            }}>
              <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: '500' }}>
                ⚠️ Alerta de {parametroConfig.nombreCompleto.toLowerCase()}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };
  // Gráfico especial para dirección del viento (rosa de los vientos)
  const renderWindDirectionChart = () => {
    // Agrupar datos por dirección (8 sectores)
    const directionSectors = [
      { name: 'N', start: 337.5, end: 22.5, value: 0 },
      { name: 'NE', start: 22.5, end: 67.5, value: 0 },
      { name: 'E', start: 67.5, end: 112.5, value: 0 },
      { name: 'SE', start: 112.5, end: 157.5, value: 0 },
      { name: 'S', start: 157.5, end: 202.5, value: 0 },
      { name: 'SW', start: 202.5, end: 247.5, value: 0 },
      { name: 'W', start: 247.5, end: 292.5, value: 0 },
      { name: 'NW', start: 292.5, end: 337.5, value: 0 }
    ];
    // Contar frecuencia por sector (usar la métrica principal para la dirección)
    filteredData.forEach(item => {
      const direction = item[parametroConfig.metricaPrincipal];
      if (typeof direction !== 'number') return;
      for (const sector of directionSectors) {
        if (
          (sector.start <= sector.end && direction >= sector.start && direction < sector.end) ||
          (sector.start > sector.end && (direction >= sector.start || direction < sector.end))
        ) {
          sector.value += 1;
          break;
        }
      }
    });
    const maxValue = Math.max(...directionSectors.map(s => s.value));
    return (
      <RadialBarChart 
        width={500} 
        height={300} 
        cx={150} 
        cy={150} 
        innerRadius={30} 
        outerRadius={140} 
        barSize={20} 
        data={directionSectors}
      >
        <PolarAngleAxis 
          type="number" 
          domain={[0, 360]} 
          angleAxisId={0} 
          tick={false}
        />
        <RadialBar
          minAngle={15}
          background
          clockWise
          dataKey="value"
          cornerRadius={10}
          fill={parametroConfig.color}
        />
        <text
          x={150}
          y={150}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '24px', fontWeight: 'bold', fill: 'white' }}
        >
          {stats.current}°
        </text>
        <Legend
          iconSize={10}
          width={120}
          height={140}
          layout="vertical"
          verticalAlign="middle"
          wrapperStyle={{ color: 'white', left: 350, top: 50 }}
        />
      </RadialBarChart>
    );
  };
  const renderChart = () => {
    if (parametro === 'direccion_viento') {
      return renderWindDirectionChart();
    }
    const commonProps = {
      data: filteredData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };
    // Solo la métrica principal
    const metricas = [
      { 
        key: parametroConfig.metricaPrincipal, 
        name: parametroConfig.nombreCompleto, 
        color: parametroConfig.color 
      }
    ];
    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12, fill: '#cbd5e1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#cbd5e1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              label={{ value: `${parametroConfig.nombreCompleto} (${parametroConfig.unidad})`, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#cbd5e1' } }}
            />
            <Tooltip content={customTooltip} />
            <Legend />
            {metricas.map((metric) => (
              <Area
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.name}
                stroke={metric.color}
                fill={metric.color}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12, fill: '#cbd5e1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#cbd5e1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              label={{ value: `${parametroConfig.nombreCompleto} (${parametroConfig.unidad})`, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#cbd5e1' } }}
            />
            <Tooltip content={customTooltip} />
            <Legend />
            <Bar 
              dataKey={parametroConfig.metricaPrincipal} 
              name={parametroConfig.nombreCompleto} 
              fill={parametroConfig.color} 
            />
          </BarChart>
        );
      
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12, fill: '#cbd5e1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#cbd5e1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              label={{ value: `${parametroConfig.nombreCompleto} (${parametroConfig.unidad})`, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#cbd5e1' } }}
            />
            <Tooltip content={customTooltip} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={parametroConfig.metricaPrincipal} 
              name={parametroConfig.nombreCompleto} 
              stroke={parametroConfig.color} 
              strokeWidth={3} 
              dot={{ r: 3 }} 
            />
            {metricas.slice(1).map((metric, index) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.name}
                stroke={metric.color}
                strokeWidth={2}
                strokeDasharray={index % 2 === 0 ? "5 5" : "0"}
              />
            ))}
          </ComposedChart>
        );
      
      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12, fill: '#cbd5e1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#cbd5e1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              label={{ value: `${parametroConfig.nombreCompleto} (${parametroConfig.unidad})`, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#cbd5e1' } }}
            />
            <Tooltip content={customTooltip} />
            <Legend />
            {metricas.map((metric, index) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.name}
                stroke={metric.color}
                strokeWidth={metric.key === parametroConfig.metricaPrincipal ? 3 : 2}
                dot={{ fill: metric.color, strokeWidth: 2, r: metric.key === parametroConfig.metricaPrincipal ? 4 : 3 }}
                activeDot={{ r: 6, fill: metric.color, strokeWidth: 2, stroke: '#fff' }}
                strokeDasharray={metric.key !== parametroConfig.metricaPrincipal && index % 2 === 0 ? '5 5' : '0'}
              />
            ))}
          </LineChart>
        );
    }
  };
  // Estilos usando el mismo tema del dashboard principal
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      padding: '24px'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: 'white',
      textDecoration: 'none',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: 'white',
      margin: 0,
      background: `linear-gradient(90deg, ${parametroConfig.color}, ${parametroConfig.color}99)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    subtitle: {
      color: '#cbd5e1',
      fontSize: '16px',
      margin: '4px 0 0 0'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    liveIndicator: {
      display: 'flex',
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
      backgroundColor: parametroConfig.color,
      borderRadius: '50%',
      animation: 'pulse 2s infinite'
    },
    liveText: {
      color: parametroConfig.color,
      fontSize: '14px',
      fontWeight: '500'
    },
    actionButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.3s ease'
    },
    main: {
      display: 'flex',
      height: 'calc(100vh - 96px)'
    },
    sidebar: {
      width: '350px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.2)',
      padding: '24px',
      overflowY: 'auto'
    },
    sidebarHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px'
    },
    sidebarTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: 0
    },
    section: {
      marginBottom: '24px'
    },
    sectionLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#cbd5e1',
      marginBottom: '12px'
    },
    chartTypeGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px'
    },
    chartTypeButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.3s ease'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '16px'
    },
    statCard: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      textAlign: 'center'
    },
    statValue: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: 'white',
      margin: 0
    },
    statLabel: {
      fontSize: '12px',
      color: '#cbd5e1',
      margin: '4px 0 0 0'
    },
    alertsCard: {
      background: `linear-gradient(135deg, ${parametroConfig.color}22, ${parametroConfig.color}44)`,
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '16px',
      border: `1px solid ${parametroConfig.color}66`,
      marginBottom: '16px'
    },
    alertTitle: {
      fontSize: '14px',
      fontWeight: '500',
      color: parametroConfig.color,
      margin: '0 0 8px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      color: 'white',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      color: 'white',
      fontSize: '14px'
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    toolbar: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    toolbarRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      fontSize: '14px',
      color: '#cbd5e1'
    },
    chartArea: {
      flex: 1,
      padding: '24px'
    },
    chartContainer: {
      height: '100%',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    chartHeader: {
      marginBottom: '20px'
    },
    chartTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: 'white',
      margin: '0 0 12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    parametroIcon: {
      width: '28px',
      height: '28px',
      color: parametroConfig.color
    }
  };
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .filter-button:hover {
          background-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }
        
        .chart-type-button:hover {
          transform: translateY(-1px);
        }
        
        .action-button:hover {
          transform: translateY(-2px);
        }
        
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
        
        select option {
          background-color: #1f2937;
          color: white;
        }
        
        input:focus, select:focus {
          outline: none;
          border-color: ${parametroConfig.color};
          box-shadow: 0 0 0 3px ${parametroConfig.color}33;
        }
      `}</style>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <button style={styles.backButton} className="filter-button" onClick={handleVolver}>
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              <span>Volver</span>
            </button>
            <div>
              <h1 style={styles.title}>
                {title || `Análisis Histórico - ${parametroConfig.nombreCompleto}`}
              </h1>
              <p style={styles.subtitle}>
                Monitoreo detallado de {parametroConfig.nombreCompleto.toLowerCase()}
              </p>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.liveIndicator}>
              <div style={styles.liveDot}></div>
              <span style={styles.liveText}>Sensor activo</span>
            </div>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                ...styles.actionButton,
                background: autoRefresh 
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
              className="action-button"
            >
              <RefreshCw style={{ 
                width: '16px', 
                height: '16px',
                animation: autoRefresh ? 'spin 2s linear infinite' : 'none'
              }} />
              <span>Auto-actualizar</span>
            </button>
            
            <button
              style={{
                ...styles.actionButton,
                background: `linear-gradient(135deg, ${parametroConfig.color}, ${parametroConfig.color}99)`,
                color: 'white'
              }}
              className="action-button"
            >
              <Download style={{ width: '16px', height: '16px' }} />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>
      <div style={styles.main}>
        {/* Sidebar */}
        {showFilters && (
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h2 style={styles.sidebarTitle}>
                <IconoParametro style={{ width: '20px', height: '20px' }} />
                {parametroConfig.nombreCompleto}
              </h2>
            </div>
            {/* Estadísticas principales */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Estado Actual del Sistema</label>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>{stats.current?.toFixed(1)}{parametroConfig.unidad}</p>
                  <p style={styles.statLabel}>Actual</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>{stats.avg?.toFixed(1)}{parametroConfig.unidad}</p>
                  <p style={styles.statLabel}>Promedio</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>{stats.min?.toFixed(1)}{parametroConfig.unidad}</p>
                  <p style={styles.statLabel}>Mínima</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>{stats.max?.toFixed(1)}{parametroConfig.unidad}</p>
                  <p style={styles.statLabel}>Máxima</p>
                </div>
              </div>
              {/* Alertas */}
              {stats.alerts > 0 && parametro !== 'direccion_viento' && (
                <div style={styles.alertsCard}>
                  <h3 style={styles.alertTitle}>
                    <AlertTriangle style={{ width: '16px', height: '16px' }} />
                    Alertas de {parametroConfig.nombreCompleto}
                  </h3>
                  <p style={{ color: '#fbbf24', fontSize: '14px', margin: 0 }}>
                    {stats.alerts} eventos fuera del rango normal detectados
                  </p>
                </div>
              )}
              {/* Tendencia */}
              {parametro !== 'direccion_viento' && (
                <div style={{
                  ...styles.statCard,
                  background: stats.trend > 0 
                    ? `linear-gradient(135deg, ${parametroConfig.color}22, ${parametroConfig.color}44)`
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1))',
                  border: `1px solid ${stats.trend > 0 ? `${parametroConfig.color}66` : 'rgba(59, 130, 246, 0.2)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {stats.trend > 0 ? (
                      <TrendingUp style={{ width: '16px', height: '16px', color: parametroConfig.color }} />
                    ) : (
                      <TrendingDown style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                    )}
                    <p style={styles.statValue}>
                      {Math.abs(stats.trend)?.toFixed(1)}{parametroConfig.unidad}
                    </p>
                  </div>
                  <p style={styles.statLabel}>
                    Tendencia {stats.trend > 0 ? 'ascendente' : 'descendente'}
                  </p>
                </div>
              )}
            </div>
            {/* Selector de tipo de gráfico */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Tipo de Visualización</label>
              <div style={styles.chartTypeGrid}>
                {[
                  { type: 'line', icon: TrendingUp, label: 'Línea' },
                  { type: 'area', icon: Activity, label: 'Área' },
                  { type: 'bar', icon: BarChart3, label: 'Barras' },
                  { type: 'composed', icon: Zap, label: 'Combinado' }
                ].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => setChartType(item.type)}
                      style={{
                        ...styles.chartTypeButton,
                        background: chartType === item.type
                          ? `linear-gradient(135deg, ${parametroConfig.color}, ${parametroConfig.color}99)`
                          : 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: chartType === item.type 
                          ? `1px solid ${parametroConfig.color}66` 
                          : '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                      className="chart-type-button"
                    >
                      <IconComponent style={{ width: '16px', height: '16px' }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Filtros de fecha */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Rango de Fechas</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                    Desde
                  </label>
                  <input
                    type="datetime-local"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                    Hasta
                  </label>
                  <input
                    type="datetime-local"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
            {/* Agregación temporal */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Agrupación Temporal</label>
              <select
                value={timeAggregation}
                onChange={(e) => setTimeAggregation(e.target.value)}
                style={styles.select}
              >
                <option value="raw">Datos sin procesar</option>
                <option value="minute">Por minuto</option>
                <option value="hour">Por hora</option>
                <option value="day">Por día</option>
              </select>
            </div>
            {/* Configuración de alertas */}
            {parametro !== 'direccion_viento' && (
              <div style={styles.section}>
                <label style={styles.sectionLabel}>Umbrales de Alerta</label>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                      Mínima ({parametroConfig.unidad})
                    </label>
                    <input
                      type="number"
                      value={alertThresholds.min}
                      onChange={(e) => setAlertThresholds({...alertThresholds, min: Number(e.target.value)})}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                      Máxima ({parametroConfig.unidad})
                    </label>
                    <input
                      type="number"
                      value={alertThresholds.max}
                      onChange={(e) => setAlertThresholds({...alertThresholds, max: Number(e.target.value)})}
                      style={styles.input}
                    />
                  </div>
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '12px', margin: 0 }}>
                  Rango normal: {parametroConfig.rangosNormales}
                </p>
              </div>
            )}
            {/* Estadísticas a mostrar */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Estadísticas a Mostrar</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: 'actual', label: `Valor actual` },
                  { id: 'minMax', label: 'Mínima y máxima' },
                  { id: 'promedio', label: 'Promedio' },
                  { id: 'tendencia', label: 'Tendencia' }
                ].map((stat) => (
                  <label key={stat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showStats.includes(stat.id)}
                      onChange={() => {
                        if (showStats.includes(stat.id)) {
                          setShowStats(showStats.filter(s => s !== stat.id));
                        } else {
                          setShowStats([...showStats, stat.id]);
                        }
                      }}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ color: '#cbd5e1', fontSize: '14px' }}>{stat.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Contenido principal */}
        <div style={styles.content}>
          {/* Barra de herramientas */}
          <div style={styles.toolbar}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                ...styles.actionButton,
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
              className="action-button"
            >
              {showFilters ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
              <span>{showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
            </button>
            <div style={styles.toolbarRight}>
              <span>Mostrando {filteredData.length} registros</span>
              <span>•</span>
              <span>Actualizado: {new Date().toLocaleTimeString('es-ES')}</span>
            </div>
          </div>
          {/* Área del gráfico */}
          <div style={styles.chartArea}>
            <div style={styles.chartContainer}>
              <div style={styles.chartHeader}>
                <h2 style={styles.chartTitle}>
                  <IconoParametro style={styles.parametroIcon} />
                  {chartType === 'line' && `Evolución de ${parametroConfig.nombreCompleto}`}
                  {chartType === 'area' && `Áreas de ${parametroConfig.nombreCompleto}`}
                  {chartType === 'bar' && `Barras de ${parametroConfig.nombreCompleto}`}
                  {chartType === 'composed' && `${parametroConfig.nombreCompleto} y Métricas Relacionadas`}
                  {parametro === 'direccion_viento' && 'Rosa de los Vientos'}
                </h2>
                <p style={{ color: '#cbd5e1', margin: 0, fontSize: '14px' }}>
                  Visualización de datos históricos de {parametroConfig.nombreCompleto.toLowerCase()}
                </p>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}