import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { paramDataState, alertThresholdsState, lastUpdateState, autoRefreshState } from '../state/parametroState';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { TrendingUp, BarChart3, Activity, Download, RefreshCw, ArrowLeft, Eye, EyeOff, Thermometer, AlertTriangle, Zap, Gauge, Wind, Navigation, Sun, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function ParametroDetalles({ datas, title, parametro }) {
  // Estados para filtros y configuración
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [chartType, setChartType] = useState('line');
  const [timeAggregation, setTimeAggregation] = useState('hour');
  const [showFilters, setShowFilters] = useState(true);
  const [autoRefresh, setAutoRefresh] = useRecoilState(autoRefreshState(parametro));
  const [showStats, setShowStats] = useState(['actual', 'minMax', 'promedio']);
  // local state mirrors Recoil atom for data — use Recoil for shared multi-views
  const [localData, setLocalData] = useRecoilState(paramDataState(parametro));
  const data = useMemo(() => (localData && Array.isArray(localData) ? localData : []), [localData]);
  const setData = setLocalData;
  const [lastUpdate, setLastUpdate] = useRecoilState(lastUpdateState(parametro));
  const [, setIsLoading] = useState(false);
  const [, setError] = useState(null);
  const getDefaultThresholds = (param) => {
    const defaults = {
      humedad: { min: 30, max: 80 },
      presion: { min: 980, max: 1050 },
      velocidad_viento: { min: 0, max: 50 },
      direccion_viento: { min: 0, max: 360 },
      indice_uv: { min: 0, max: 11 },
      temperatura: { min: 10, max: 35 }
    };
    return defaults[param] || defaults.temperatura;
  };
  const [savedThresholds, setSavedThresholds] = useRecoilState(alertThresholdsState(parametro));
  const [editThresholds, setEditThresholds] = useState(() => getDefaultThresholds(parametro));
  const currentThresholds = editThresholds ?? savedThresholds ?? getDefaultThresholds(parametro);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [thresholdLoadError, setThresholdLoadError] = useState(null);
  // loadedThresholds no necesario ahora (guardamos en Recoil)
  const [thresholdSaved, setThresholdSaved] = useState(false);
  const navigate = useNavigate();
  const handleVolver = () => {
    navigate('/clima');
  };

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

  // Icono principal para este parámetro (componente de lucide-react)
  const IconoParametro = parametroConfig.icono || Thermometer;

            
  // sampleData removed: not used currently, keep codebase smaller and avoid lint warnings
  // Ref para el interval ID
  const pollRef = useRef(null);
  // Poll interval (ms) - cambiar aquí para ajustar la frecuencia de fetch
  const POLL_INTERVAL_MS = 5000; // 5 segundos
  
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  // Cargar umbrales desde backend cuando cambia el parámetro
  useEffect(() => {
    let mounted = true;
    const fetchThresholds = async () => {
      try {
        setThresholdLoadError(null);
        const res = await fetch(`${API_BASE.replace(/\/+$/, '')}/alertas/${encodeURIComponent(parametro)}`);
        if (!res.ok) throw new Error('No se pudo obtener umbrales');
        const json = await res.json();
        if (!mounted) return;
        if (json && (json.min !== null || json.max !== null)) {
          const vals = { min: Number(json.min ?? getDefaultThresholds(parametro).min), max: Number(json.max ?? getDefaultThresholds(parametro).max) };
          setSavedThresholds(vals);
          setEditThresholds(vals);
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Error cargando umbrales', err);
        setThresholdLoadError(String(err));
      }
    };
    if (parametro) fetchThresholds();
    return () => { mounted = false; };
  }, [parametro]); // eslint-disable-line

  // mantener editThresholds sincronizados con savedThresholds cuando cambien
  useEffect(() => {
    if (savedThresholds) setEditThresholds(savedThresholds);
  }, [savedThresholds]);

  // Guardar/actualizar umbrales en backend
  const saveAlertThresholds = async () => {
    try {
      setSavingThresholds(true);
      const body = { min: Number(editThresholds.min), max: Number(editThresholds.max) };
      const res = await fetch(`${API_BASE.replace(/\/+$/, '')}/alertas/${encodeURIComponent(parametro)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Error guardando umbrales');
      }
      // actualizar estado local con los valores guardados
      setSavedThresholds({ min: Number(body.min), max: Number(body.max) });
      setThresholdSaved(true);
      setTimeout(() => setThresholdSaved(false), 2000);
    } catch (err) {
      console.error('Error guardando umbrales', err);
      window.alert('Error guardando umbrales: ' + (err.message || String(err)));
    } finally {
      setSavingThresholds(false);
    }
  };

  // Helper: agrega agregación temporal (raw, minute, hour, day)
  const aggregateData = (rows, agg, metricKey) => {
    if (!rows || !rows.length) return [];
    if (agg === 'raw') return rows;

    const buckets = new Map();
    rows.forEach((r) => {
      const ts = new Date(r.timestamp);
      let key;
      switch (agg) {
        case 'minute':
          key = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()} ${ts.getHours()}:${ts.getMinutes()}`;
          break;
        case 'hour':
          key = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()} ${ts.getHours()}:00`;
          break;
        case 'day':
          key = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}`;
          break;
        default:
          key = ts.toISOString();
      }
      const val = Number(r[metricKey]);
      if (!buckets.has(key)) buckets.set(key, { sum: 0, count: 0, ts });
      const bucket = buckets.get(key);
      if (!isNaN(val)) {
        bucket.sum += val;
        bucket.count += 1;
      }
    });

    const out = Array.from(buckets.entries()).map(([k, v]) => {
      const avg = v.count > 0 ? v.sum / v.count : null;
      const d = new Date(v.ts);
      return {
        timestamp: d.toISOString(),
        time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        date: d.toLocaleDateString('es-ES'),
        fullDate: d.toLocaleString('es-ES'),
        [metricKey]: avg !== null ? Math.round(avg * 100) / 100 : null,
        isAlert: false
      };
    });
    // ordenar por timestamp
    out.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return out;
  };

  // Exportar datos actuales a CSV separado por ';'
  const exportCSV = () => {
    const metricKey = parametroConfig.metricaPrincipal;
    // Preferir datos filtrados por UI, si no usar los datos cargados
    const rows = (filteredData && filteredData.length) ? filteredData : data;
    if (!rows || !rows.length) {
      // feedback simple al usuario
      window.alert('No hay datos para exportar');
      return;
    }

    const escape = (v) => {
      if (v == null) return '""';
      const s = String(v);
      // escapar comillas dobles duplicándolas; envolver en comillas para preservar separadores
      return '"' + s.replace(/"/g, '""') + '"';
    };

    const headers = ['timestamp', metricKey];
    const lines = [];
    lines.push(headers.map(h => escape(h)).join(';'));
    for (const r of rows) {
      const ts = r.timestamp || r.time || '';
      const val = r[metricKey] != null ? r[metricKey] : '';
      lines.push([escape(ts), escape(val)].join(';'));
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const namePrefix = parametro || metricKey || 'export';
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.download = `${namePrefix}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        // Normalizar datetime-local (sin TZ) a ISO con zona (UTC) antes de enviar
        if (dateRange.start) {
          try {
            const s = new Date(dateRange.start);
            queryParams.append('start', s.toISOString());
          } catch (e) {
            queryParams.append('start', dateRange.start);
          }
        }
        if (dateRange.end) {
          try {
            const e = new Date(dateRange.end);
            queryParams.append('end', e.toISOString());
          } catch (err) {
            queryParams.append('end', dateRange.end);
          }
        }
        // indicar qué métrica queremos (backend implementará filtro)
        if (parametro) queryParams.append('metric', parametro);
        queryParams.append('agg', timeAggregation || 'raw');

        // Construir URL completa hacia el backend usando API_BASE
        const url = `${API_BASE.replace(/\/+$/, '')}/clima?${queryParams.toString()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar los datos');
        const result = await response.json();
        
        if (!mounted) return;
        const metricKey = parametroConfig.metricaPrincipal;

        // Normalizar filas: asegurar timestamp y convertir valor a number.
        // Filtrar filas donde la métrica no exista o no sea convertible a número.
        const rows = (Array.isArray(result) ? result : []).map(r => {
          const rawTs = r.timestamp || r.time || r.ts || new Date().toISOString();
          const tsObj = new Date(rawTs);
          const raw = r[metricKey];
          const num = raw == null || raw === '' ? null : Number(raw);
          return {
            ...r,
            // normalizar timestamp y campos legibles que usa el chart
            timestamp: tsObj.toISOString(),
            time: tsObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            date: tsObj.toLocaleDateString('es-ES'),
            fullDate: tsObj.toLocaleString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            [metricKey]: isNaN(num) ? null : num
          };
        }).filter(r => r.timestamp && r[metricKey] !== null);

        // Filtrar por rango de fechas en cliente (por si el backend no lo hace)
        let filtered = rows;
        if (dateRange.start || dateRange.end) {
          filtered = rows.filter((item) => {
            const t = new Date(item.timestamp);
            if (dateRange.start && t < new Date(dateRange.start)) return false;
            if (dateRange.end && t > new Date(dateRange.end)) return false;
            return true;
          });
        }

        // Agregación
        const aggregated = aggregateData(filtered, timeAggregation, metricKey);

        // Añadir campos auxiliares y flags de alerta (usar thresholds editados si existen)
        const enriched = aggregated.map((it) => ({
          ...it,
          isAlert: parametro !== 'd_viento' && typeof it[metricKey] === 'number' && (it[metricKey] < (currentThresholds?.min ?? getDefaultThresholds(parametro).min) || it[metricKey] > (currentThresholds?.max ?? getDefaultThresholds(parametro).max))
        }));

        // Eliminar puntos con valor null por seguridad (recharts ignora nulls)
        const final = enriched.filter(it => typeof it[metricKey] === 'number' && !isNaN(it[metricKey]));
        setData(final);
        setLastUpdate(new Date());
      } catch (err) {
        if (!mounted) return;
        setError(err.message || String(err));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // fetch inicial
    fetchData();

    // Polling: si autoRefresh está activo, re-ejecutar cada POLL_INTERVAL_MS
    if (autoRefresh) {
      pollRef.current = setInterval(fetchData, POLL_INTERVAL_MS);
    }

    return () => {
      mounted = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [dateRange.start, dateRange.end, timeAggregation, parametro, autoRefresh, parametroConfig, editThresholds, API_BASE, currentThresholds, setData, setLastUpdate]);
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
    // maxValue not required currently
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
      flexDirection: 'column',
      height: 'calc(100vh - 96px)',
      overflow: 'hidden'
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
      flexDirection: 'column',
      overflow: 'auto',
      boxSizing: 'border-box'
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
      padding: '24px',
      overflow: 'auto'
    },
    chartContainer: {
      height: '100%',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    topFilters: {
      width: '100%',
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '16px',
      margin: '12px 24px',
      boxSizing: 'border-box'
    },
    topFiltersHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    topFiltersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px'
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

  // Fin de estilos
        
          return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .filter-button:hover { background-color: rgba(255, 255, 255, 0.15); transform: translateY(-2px); }
        .chart-type-button:hover { transform: translateY(-1px); }
        .action-button:hover { transform: translateY(-2px); }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); }
        select option { background-color: #1f2937; color: white; }
        input:focus, select:focus { outline: none; }
        /* Responsive adjustments for top filters */
        .top-filters-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
        .top-filters-header { display: flex; align-items: center; justify-content: space-between; }
        .date-range { display: flex; gap: 8px; align-items: center; }

        @media (max-width: 700px) {
          .top-filters-grid { grid-template-columns: 1fr !important; }
          .top-filters-header { flex-direction: column; align-items: flex-start; gap: 8px; }
          .date-range { flex-direction: column; align-items: stretch; }
          .date-range input[type="datetime-local"] { width: 100% !important; }
          .chart-type-button, .action-button { padding: 10px 12px; font-size: 13px; }
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
              <h1 style={styles.title}>{title || `Análisis Histórico - ${parametroConfig.nombreCompleto}`}</h1>
              <p style={styles.subtitle}>Monitoreo detallado de {parametroConfig.nombreCompleto.toLowerCase()}</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.liveIndicator}>
              <div style={styles.liveDot}></div>
              <span style={styles.liveText}>Sensor activo</span>
            </div>
            <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ ...styles.actionButton, background: autoRefresh ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255, 255, 255, 0.1)', color: 'white' }} className="action-button">
              <RefreshCw style={{ width: '16px', height: '16px', animation: autoRefresh ? 'spin 2s linear infinite' : 'none' }} />
              <span>Auto-actualizar</span>
            </button>
            <button onClick={exportCSV} disabled={!(filteredData && filteredData.length) && !(data && data.length)} style={{ ...styles.actionButton, background: `linear-gradient(135deg, ${parametroConfig.color}, ${parametroConfig.color}99)`, color: 'white', opacity: (!(filteredData && filteredData.length) && !(data && data.length)) ? 0.6 : 1, cursor: (!(filteredData && filteredData.length) && !(data && data.length)) ? 'not-allowed' : 'pointer' }} className="action-button">
              <Download style={{ width: '16px', height: '16px' }} />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      <div style={styles.main}>
        {/* Contenido principal */}
        <div style={styles.content}>
          {showFilters && (
            <div style={styles.topFilters}>
              <div style={styles.topFiltersHeader} className="top-filters-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconoParametro style={{ width: '20px', height: '20px' }} />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{parametroConfig.nombreCompleto}</div>
                    <div style={{ color: '#cbd5e1', fontSize: '12px' }}>{parametroConfig.rangosNormales}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {stats.alerts > 0 && parametro !== 'direccion_viento' && (
                    <div style={styles.alertsCard}>
                      <AlertTriangle style={{ width: '16px', height: '16px' }} />
                      <span style={{ marginLeft: '6px' }}>{stats.alerts} alertas</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.topFiltersGrid} className="top-filters-grid">
                <div>
                  <label style={styles.sectionLabel}>Tipo de Visualización</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                              : 'rgba(255, 255, 255, 0.1)'
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

                <div style={{ gridColumn: '1', justifySelf: 'start' }}>
                  <label style={styles.sectionLabel}>Rango de Fechas</label>
                  <div className="date-range" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <input
                      type="datetime-local"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      style={{ ...styles.input, width: 'calc(50% - 6px)' }}
                    />
                    <input
                      type="datetime-local"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      style={{ ...styles.input, width: 'calc(50% - 6px)' }}
                    />
                  </div>
                </div>

                <div>
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

                {parametro !== 'direccion_viento' && (
                  <div>
                    <label style={styles.sectionLabel}>Umbrales de Alerta</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={editThresholds?.min ?? getDefaultThresholds(parametro).min}
                        onChange={(e) => setEditThresholds({...editThresholds, min: Number(e.target.value)})}
                        style={{ ...styles.input, width: '110px' }}
                      />
                      <input
                        type="number"
                        value={editThresholds?.max ?? getDefaultThresholds(parametro).max}
                        onChange={(e) => setEditThresholds({...editThresholds, max: Number(e.target.value)})}
                        style={{ ...styles.input, width: '110px' }}
                      />
                      <button
                        onClick={saveAlertThresholds}
                        disabled={savingThresholds || (savedThresholds && savedThresholds.min === editThresholds.min && savedThresholds.max === editThresholds.max)}
                        style={{
                          ...styles.actionButton,
                          background: `linear-gradient(135deg, ${parametroConfig.color}, ${parametroConfig.color}99)`,
                          color: 'white',
                          padding: '8px 12px'
                        }}
                      >
                        {savingThresholds ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                    {thresholdSaved && <div style={{ color: '#34d399', marginTop: '6px' }}>Guardado</div>}
                    {thresholdLoadError && <div style={{ color: '#f87171', marginTop: '6px' }}>Error cargando umbrales</div>}
                  </div>
                )}

                <div>
                  <label style={styles.sectionLabel}>Estadísticas a Mostrar</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'actual', label: `Actual` },
                      { id: 'minMax', label: 'Mín y Máx' },
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
            </div>
          )}
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
              <span>Actualizado: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('es-ES') : '—'}</span>
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
              <ResponsiveContainer width="100%" height={400}>
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}