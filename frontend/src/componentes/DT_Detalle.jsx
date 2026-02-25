import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Filter, Calendar, TrendingUp, BarChart3, Activity, Download, Settings, RefreshCw, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { dtDataState, dtLastUpdateState, dtAutoRefreshState } from '../state/dtState'; // Changed from opalState

export default function DtDetalles({ datas, title }) { // Renamed component
    const location = useLocation();
    // Estados para filtros y configuración
    const [selectedMetrics, setSelectedMetrics] = useState([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [chartType, setChartType] = useState('line');
    const [timeAggregation, setTimeAggregation] = useState('hour');
    const [showFilters, setShowFilters] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Recoil state for DT historical data
    const [localDtData, setLocalDtData] = useRecoilState(dtDataState);
    const [dtLastUpdate, setDtLastUpdate] = useRecoilState(dtLastUpdateState);
    const [dtAutoRefresh, setDtAutoRefresh] = useRecoilState(dtAutoRefreshState);

    // Polling ref and interval
    const dtPollRef = useRef(null);
    const POLL_INTERVAL_MS = 5000; // 5s default
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    // Datos (preferir datos del backend cargados, luego prop `datas`, luego location.state)
    const data = useMemo(() => {
        if (localDtData && Array.isArray(localDtData) && localDtData.length) return localDtData;
        if (datas && Array.isArray(datas)) return datas;
        if (location.state?.dtData && Array.isArray(location.state.dtData)) return location.state.dtData;
        return [];
    }, [datas, localDtData, location.state]);

    // Extraer métricas disponibles
    const availableMetrics = useMemo(() => {
        if (!data.length) return [];
        const firstItem = data[0];
        const mapKey = (k) => {
            if (k === 'voltaje') return 'voltage';
            if (k === 'corriente') return 'current';
            if (k === 'potencia') return 'power';
            return k;
        };
        const keys = Object.keys(firstItem).filter(k => !['timestamp', 'time', 'date', 'station'].includes(k) && typeof firstItem[k] === 'number');
        const canonical = [];
        for (const k of keys) {
            const kk = mapKey(k);
            if (!canonical.includes(kk)) canonical.push(kk);
        }
        console.log('Available metrics (DT):', { keys, canonical });
        return canonical;
    }, [data]);

    // Helper: agregación temporal
    const aggregateDtData = (rows, agg) => {
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
                case 'week':
                    const d = new Date(ts);
                    d.setDate(d.getDate() - d.getDay());
                    key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                    break;
                default:
                    key = ts.toISOString();
            }
            const bucketKey = `${key}|${r.station || 'default'}`;

            if (!buckets.has(bucketKey)) {
                buckets.set(bucketKey, { values: {}, count: 0, ts, station: r.station });
            }

            const bucket = buckets.get(bucketKey);
            const metrics = ['voltage', 'voltaje', 'current', 'corriente', 'power', 'potencia'];

            for (const metric of metrics) {
                if (r[metric] != null && typeof r[metric] === 'number') {
                    if (!bucket.values[metric]) bucket.values[metric] = { sum: 0, count: 0 };
                    bucket.values[metric].sum += r[metric];
                    bucket.values[metric].count += 1;
                }
            }
            bucket.count += 1;
        });

        const out = Array.from(buckets.entries()).map(([k, v]) => {
            const d = new Date(v.ts);
            const result = {
                timestamp: d.toISOString(),
                time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                date: d.toLocaleDateString('es-ES'),
                station: v.station
            };

            // Calcular promedios
            for (const metric of ['voltage', 'voltaje', 'current', 'corriente', 'power', 'potencia']) {
                if (v.values[metric]) {
                    result[metric] = Math.round((v.values[metric].sum / v.values[metric].count) * 100) / 100;
                }
            }

            return result;
        });

        out.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return out;
    };

    const navigate = useNavigate();

    const handleVolver = () => {
        navigate('/clima');
    };

    // Configuración de métricas
    const metricsConfig = {
        voltage: { label: 'Voltaje', unit: 'V', color: '#8884d8', icon: '⚡', gradient: 'linear-gradient(135deg, #8884d8, #6366f1)' },
        current: { label: 'Corriente', unit: 'A', color: '#82ca9d', icon: '🔌', gradient: 'linear-gradient(135deg, #82ca9d, #10b981)' },
        power: { label: 'Potencia', unit: 'W', color: '#ffc658', icon: '💡', gradient: 'linear-gradient(135deg, #ffc658, #f59e0b)' },
        frequency: { label: 'Frecuencia', unit: 'Hz', color: '#ff7300', icon: '📊', gradient: 'linear-gradient(135deg, #ff7300, #ef4444)' },
        temperature: { label: 'Temperatura', unit: '°C', color: '#00ff7f', icon: '🌡️', gradient: 'linear-gradient(135deg, #00ff7f, #22c55e)' },
        efficiency: { label: 'Eficiencia', unit: '%', color: '#ff1493', icon: '⚙️', gradient: 'linear-gradient(135deg, #ff1493, #ec4899)' }
    };

    // Inicializar métricas
    React.useEffect(() => {
        if (availableMetrics.length > 0 && selectedMetrics.length === 0) {
            setSelectedMetrics(availableMetrics.slice(0, 3));
        }
    }, [availableMetrics, selectedMetrics.length]);

    useEffect(() => {
        let mounted = true;

        // TODO: Connect this to the backend when the endpoint is ready
        // const url = `${API_BASE.replace(/\/+$/, '')}/dt?${queryParams.toString()}`;
        const fetchData = async () => {
            try {
                const queryParams = new URLSearchParams();
                if (dateRange.start) {
                    try { queryParams.append('start', new Date(dateRange.start).toISOString()); } catch (e) { queryParams.append('start', dateRange.start); }
                }
                if (dateRange.end) {
                    try { queryParams.append('end', new Date(dateRange.end).toISOString()); } catch (e) { queryParams.append('end', dateRange.end); }
                }
                queryParams.append('agg', timeAggregation || 'raw');

                const limit = (dateRange.start && dateRange.end) ? 100000 : 500000;
                queryParams.append('limit', limit);

                // TODO: CHANGE THIS URL TO THE DT ENDPOINT
                // const url = `${API_BASE.replace(/\/+$/, '')}/dt?${queryParams.toString()}`;

                /*
                const response = await fetch(url);
                if (!response.ok) throw new Error('Error al cargar datos DT');
                const result = await response.json();
                if (!mounted) return;
                setLocalDtData(result);
                setDtLastUpdate(new Date());
                */
            } catch (err) {
                console.error('Error fetching DT history:', err);
            }
        };

        if ((dtAutoRefresh || autoRefresh)) {
            dtPollRef.current = setInterval(fetchData, POLL_INTERVAL_MS);
        }

        return () => {
            mounted = false;
            if (dtPollRef.current) {
                clearInterval(dtPollRef.current);
                dtPollRef.current = null;
            }
        };
    }, [dateRange.start, dateRange.end, timeAggregation, dtAutoRefresh, autoRefresh, API_BASE, setLocalDtData, setDtLastUpdate]);

    const filteredData = useMemo(() => {
        let filtered = [...data];

        if (dateRange.start && dateRange.end) {
            const start = new Date(dateRange.start);
            const end = new Date(dateRange.end);
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= start && itemDate <= end;
            });
        }

        const agg = (dateRange.start && dateRange.end) ? timeAggregation : timeAggregation;
        let aggregated = aggregateDtData(filtered, agg);

        const maxPoints = agg === 'raw' ? 1000 : 5000;
        if (aggregated.length > maxPoints) {
            const step = Math.ceil(aggregated.length / maxPoints);
            aggregated = aggregated.filter((_, i) => i % step === 0);
        }

        return aggregated;
    }, [data, dateRange, timeAggregation]);

    const toggleMetric = (metric) => {
        setSelectedMetrics(prev =>
            prev.includes(metric)
                ? prev.filter(m => m !== metric)
                : [...prev, metric]
        );
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
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>
                        {`Tiempo: ${label}`}
                    </p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{
                            fontWeight: '600',
                            color: entry.color,
                            margin: '2px 0',
                            fontSize: '16px'
                        }}>
                            {`${metricsConfig[entry.dataKey]?.label || entry.dataKey}: ${entry.value.toFixed(2)} ${metricsConfig[entry.dataKey]?.unit || ''}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const exportCSV = () => {
        const metrics = selectedMetrics && selectedMetrics.length ? selectedMetrics : (availableMetrics.length ? availableMetrics.slice(0, 3) : ['voltage', 'current', 'power']);
        const rows = (filteredData && filteredData.length) ? filteredData : data;
        if (!rows || !rows.length) {
            window.alert('No hay datos para exportar');
            return;
        }

        const escape = (v) => {
            if (v == null) return '""';
            const s = String(v);
            return '"' + s.replace(/"/g, '""') + '"';
        };

        const headers = ['timestamp', ...metrics];
        const lines = [];
        lines.push(headers.map(h => escape(h)).join(';'));
        const round3 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 1000) / 1000 : v);

        for (const r of rows) {
            const ts = r.timestamp || r.time || '';
            const values = metrics.map(k => {
                let v = r[k];
                if (v === undefined) {
                    if (k === 'voltage' && r.voltaje !== undefined) v = r.voltaje;
                    else if (k === 'current' && r.corriente !== undefined) v = r.corriente;
                    else if (k === 'power' && r.potencia !== undefined) v = r.potencia;
                    else if (k === 'voltaje' && r.voltage !== undefined) v = r.voltage;
                    else if (k === 'corriente' && r.current !== undefined) v = r.current;
                    else if (k === 'potencia' && r.power !== undefined) v = r.power;
                }
                const out = (typeof v === 'number' && isFinite(v)) ? round3(v) : v;
                return escape(out == null ? '' : out);
            });
            lines.push([escape(ts), ...values].join(';'));
        }

        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const namePrefix = 'dt';
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.download = `${namePrefix}_${stamp}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const renderChart = () => {
        const commonProps = {
            data: filteredData,
            margin: { top: 20, right: 30, left: 20, bottom: 60 }
        };

        if (!filteredData || filteredData.length === 0) return <div>Sin datos</div>;
        if (!selectedMetrics || selectedMetrics.length === 0) return <div>Selecciona métricas</div>;

        switch (chartType) {
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                        <Tooltip content={customTooltip} />
                        <Legend />
                        {selectedMetrics.map((metric) => (
                            <Area key={metric} type="monotone" dataKey={metric} stroke={metricsConfig[metric]?.color || '#8884d8'} fill={metricsConfig[metric]?.color || '#8884d8'} fillOpacity={0.3} strokeWidth={2} />
                        ))}
                    </AreaChart>
                );
            case 'bar':
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                        <Tooltip content={customTooltip} />
                        <Legend />
                        {selectedMetrics.map((metric) => (
                            <Bar key={metric} dataKey={metric} fill={metricsConfig[metric]?.color || '#8884d8'} />
                        ))}
                    </BarChart>
                );
            case 'scatter':
                return (
                    <ScatterChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                        <Tooltip content={customTooltip} />
                        <Legend />
                        {selectedMetrics.map((metric) => (
                            <Scatter key={metric} dataKey={metric} fill={metricsConfig[metric]?.color || '#8884d8'} />
                        ))}
                    </ScatterChart>
                );
            default:
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                        <Tooltip content={customTooltip} />
                        <Legend />
                        {selectedMetrics.map((metric) => (
                            <Line key={metric} type="monotone" dataKey={metric} stroke={metricsConfig[metric]?.color || '#8884d8'} strokeWidth={3} dot={{ fill: metricsConfig[metric]?.color || '#8884d8', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: metricsConfig[metric]?.color || '#8884d8', strokeWidth: 2, stroke: '#fff' }} />
                        ))}
                    </LineChart>
                );
        }
    };

    const styles = {
        container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)', fontFamily: 'system-ui, -apple-system, sans-serif' },
        header: { background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', padding: '24px' },
        headerContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto' },
        headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
        backButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', textDecoration: 'none', transition: 'all 0.3s ease', cursor: 'pointer' },
        title: { fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0, background: 'linear-gradient(90deg, #6b73ff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
        subtitle: { color: '#cbd5e1', fontSize: '16px', margin: '4px 0 0 0' },
        headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
        liveIndicator: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '50px', padding: '8px 16px', border: '1px solid rgba(255, 255, 255, 0.1)' },
        liveDot: { width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' },
        liveText: { color: '#4ade80', fontSize: '14px', fontWeight: '500' },
        actionButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.3s ease' },
        main: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)' },
        topFilters: { width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 16px', margin: '12px 24px', boxSizing: 'border-box' },
        topFiltersHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
        topFiltersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' },
        dateRangeRow: { display: 'flex', gap: '8px', alignItems: 'center' },
        chartContainer: { flex: 1, padding: '24px', position: 'relative' },
        chartCard: { background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', height: '100%', display: 'flex', flexDirection: 'column' },
        content: { flex: 1, display: 'flex', flexDirection: 'column' },
        toolbar: { background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
        toolbarRight: { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#cbd5e1' },
        chartArea: { flex: 1, padding: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        chartHeader: { marginBottom: '20px' },
        chartTitle: { fontSize: '20px', fontWeight: '600', color: 'white', margin: '0 0 12px 0' },
        metricsTagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
        metricTag: { padding: '4px 12px', borderRadius: '50px', color: 'white', fontSize: '12px', fontWeight: '500' },
        emptyState: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        emptyContent: { textAlign: 'center' },
        emptyIcon: { width: '64px', height: '64px', color: '#6b7280', margin: '0 auto 16px auto' },
        emptyTitle: { fontSize: '20px', fontWeight: '500', color: '#9ca3af', margin: '0 0 8px 0' },
        emptyDescription: { color: '#6b7280', margin: '0 0 16px 0' },
        input: { width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '14px' },
        select: { width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '14px' },
        sectionLabel: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#cbd5e1', marginBottom: '12px' },
        chartTypeButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.3s ease' }
    };

    return (
        <div style={styles.container}>
            <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .filter-button:hover { background-color: rgba(255, 255, 255, 0.15); transform: translateY(-2px); }
        .metric-item:hover { background-color: rgba(255, 255, 255, 0.1); transform: translateY(-1px); }
        .chart-type-button:hover { transform: translateY(-1px); }
        .action-button:hover { transform: translateY(-2px); }
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
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); }
        select option { background-color: #1f2937; color: white; }
        input:focus, select:focus { outline: none; border-color: #6b73ff; box-shadow: 0 0 0 3px rgba(107, 115, 255, 0.1); }
      `}</style>

            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.headerLeft}>
                        <button style={styles.backButton} className="filter-button" onClick={handleVolver}>
                            <ArrowLeft style={{ width: '16px', height: '16px' }} />
                            <span>Volver</span>
                        </button>
                        <div>
                            <h1 style={styles.title}>{title || "Detalles Digital Twin"}</h1>
                            <p style={styles.subtitle}>Análisis detallado en tiempo real</p>
                        </div>
                    </div>
                    <div style={styles.headerRight}>
                        <div style={styles.liveIndicator}>
                            <div style={styles.liveDot}></div>
                            <span style={styles.liveText}>Sistema activo</span>
                        </div>
                        <button onClick={() => { setAutoRefresh(prev => !prev); setDtAutoRefresh(prev => !prev); }} style={{ ...styles.actionButton, background: (autoRefresh || dtAutoRefresh) ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255, 255, 255, 0.1)', color: 'white' }} className="action-button">
                            <RefreshCw style={{ width: '16px', height: '16px', animation: (autoRefresh || dtAutoRefresh) ? 'spin 2s linear infinite' : 'none' }} />
                            <span>Auto-actualizar</span>
                        </button>
                        <button onClick={exportCSV} style={{ ...styles.actionButton, background: 'linear-gradient(135deg, #6b73ff, #8b5cf6)', color: 'white' }} className="action-button">
                            <Download style={{ width: '16px', height: '16px' }} />
                            <span>Exportar CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            <div style={styles.main}>
                {showFilters && (
                    <div style={styles.topFilters} className="top-filters-grid">
                        <div style={styles.topFiltersHeader} className="top-filters-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Filter style={{ width: '20px', height: '20px' }} />
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>Configuración</div>
                                    <div style={{ color: '#cbd5e1', fontSize: '12px' }}>{selectedMetrics.length} métricas seleccionadas</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button onClick={() => { setDateRange({ start: '', end: '' }); setSelectedMetrics(availableMetrics.slice(0, 3)); }} style={{ ...styles.actionButton, background: 'rgba(255, 255, 255, 0.08)', color: 'white', padding: '8px 12px' }} className="action-button">Resetear</button>
                                <button onClick={() => setSelectedMetrics(availableMetrics)} style={{ ...styles.actionButton, background: 'linear-gradient(135deg, #6b73ff, #8b5cf6)', color: 'white', padding: '8px 12px' }} className="action-button">Seleccionar Todas</button>
                            </div>
                        </div>
                        <div style={styles.topFiltersGrid}>
                            <div>
                                <label style={styles.sectionLabel}>Tipo de Visualización</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[{ type: 'line', icon: TrendingUp, label: 'Líneas' }, { type: 'area', icon: Activity, label: 'Área' }, { type: 'bar', icon: BarChart3, label: 'Barras' }, { type: 'scatter', icon: Settings, label: 'Puntos' }].map(({ type, icon: Icon, label }) => (
                                        <button key={type} onClick={() => setChartType(type)} style={{ ...styles.chartTypeButton, background: chartType === type ? 'linear-gradient(135deg, #6b73ff, #8b5cf6)' : 'rgba(255, 255, 255, 0.1)', color: 'white' }} className="chart-type-button">
                                            <Icon style={{ width: '16px', height: '16px' }} />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={styles.sectionLabel}><Calendar style={{ width: '16px', height: '16px', display: 'inline', marginRight: '8px' }} /> Rango de Fechas</label>
                                <div style={styles.dateRangeRow} className="date-range">
                                    <input type="datetime-local" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} style={{ ...styles.input, width: 'calc(50% - 6px)' }} />
                                    <input type="datetime-local" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} style={{ ...styles.input, width: 'calc(50% - 6px)' }} />
                                </div>
                            </div>
                            <div>
                                <label style={styles.sectionLabel}>Agregación Temporal</label>
                                <select value={timeAggregation} onChange={(e) => setTimeAggregation(e.target.value)} style={styles.select}>
                                    <option value="raw">Sin procesar</option>
                                    <option value="minute">Por minuto</option>
                                    <option value="hour">Por hora</option>
                                    <option value="day">Por día</option>
                                    <option value="week">Por semana</option>
                                </select>
                            </div>
                            <div>
                                <label style={styles.sectionLabel}>Métricas</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {availableMetrics.map((metric) => {
                                        const config = metricsConfig[metric] || { label: metric, color: '#8884d8' };
                                        return (
                                            <button key={metric} onClick={() => toggleMetric(metric)} style={{ padding: '8px 10px', borderRadius: '999px', background: selectedMetrics.includes(metric) ? (config.gradient || config.color) : 'rgba(255,255,255,0.04)', color: 'white', border: 'none', cursor: 'pointer' }}>
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={styles.content}>
                    <div style={styles.toolbar}>
                        <button onClick={() => setShowFilters(!showFilters)} style={{ ...styles.actionButton, background: 'rgba(255, 255, 255, 0.1)', color: 'white' }} className="filter-button">
                            {showFilters ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                            <span>{showFilters ? 'Ocultar' : 'Mostrar'} Panel</span>
                        </button>
                        <div style={styles.toolbarRight}>
                            <div>Última actualización: {new Date().toLocaleTimeString('es-ES')}</div>
                            <div>{filteredData.length.toLocaleString()} puntos de datos</div>
                        </div>
                    </div>
                    <div style={styles.chartArea}>
                        {selectedMetrics.length > 0 ? (
                            <div style={styles.chartContainer}>
                                <div style={styles.chartHeader}>
                                    <h3 style={styles.chartTitle}>Análisis Histórico - DT</h3>
                                    <div style={styles.metricsTagsContainer}>
                                        {selectedMetrics.map((metric) => {
                                            const config = metricsConfig[metric] || { color: '#8884d8', label: metric };
                                            return (
                                                <span key={metric} style={{ ...styles.metricTag, backgroundColor: config.color }}>{config.label}</span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    {renderChart()}
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={styles.chartContainer}>
                                <div style={styles.emptyState}>
                                    <div style={styles.emptyContent}>
                                        <Settings style={styles.emptyIcon} />
                                        <h3 style={styles.emptyTitle}>Selecciona métricas para visualizar</h3>
                                        <p style={styles.emptyDescription}>Utiliza el panel lateral para elegir las métricas que deseas analizar</p>
                                        <button onClick={() => setSelectedMetrics(availableMetrics.slice(0, 3))} style={{ ...styles.actionButton, background: 'linear-gradient(135deg, #6b73ff, #8b5cf6)', color: 'white' }} className="action-button">
                                            <TrendingUp style={{ width: '16px', height: '16px' }} />
                                            <span>Cargar métricas por defecto</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
