import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Zap, DollarSign, Cpu, Bell, LayoutDashboard, Activity, Bot, Lightbulb, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import StatCard from '../components/common/StatCard';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageSection from '../components/common/PageSection';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { connected, on } = useSocket();

  const load = useCallback(() => {
    Promise.all([
      api.dashboard.getOverview().then(r => setOverview(r.data)),
      api.dashboard.getDaily().then(r => {
        const d = r.data.daily_consumption || r.data.data || r.data || [];
        setDaily(d.map(item => ({ date: item.date, consumption: parseFloat(item.total_kwh) || 0 })));
      }),
      api.dashboard.getMonthly().then(r => {
        const m = r.data.monthly_consumption || r.data.data || r.data || [];
        setMonthly(m.map(item => ({ month: `${item.year}-${String(item.month).padStart(2,'0')}`, consumption: parseFloat(item.total_kwh) || 0 })));
      }),
      api.dashboard.getDeviceBreakdown().then(r => {
        const b = r.data.device_breakdown || r.data.data || r.data || [];
        setBreakdown(b.map(item => ({ name: item.category_name, value: parseFloat(item.total_kwh) || 0 })));
      }),
      api.alerts.getAll({ limit: 5 }).then(r => setAlerts(r.data.alerts || r.data || [])),
    ]).catch(() => toast.error('Error al cargar datos')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const off = on('reading:new', () => load());
    return off;
  }, [on, load]);

  if (loading) return <LoadingSpinner />;

  const stats = overview || {};

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><LayoutDashboard size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Panel de Control</h2>
          <p className="page-header-subtitle">
            {connected ? '● En tiempo real — recibiendo datos de tus sensores' : 'Resumen general de tu consumo energético'}
          </p>
        </div>
        <div className="quick-actions" style={{ marginBottom: 0 }}>
          <Link to="/assistant" className="btn btn-primary"><Bot size={16} /> Asistente IA</Link>
          <Link to="/recommendations" className="btn btn-secondary"><Lightbulb size={16} /> Recomendaciones</Link>
          <Link to="/consumption" className="btn btn-secondary"><Activity size={16} /> Agregar Lectura</Link>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <StatCard icon={<Zap size={22} />} value={`${stats.current_month_kwh || 0} kWh`} label="Consumo del mes actual" change={stats.comparison_percentage} color="primary" />
        <StatCard icon={<DollarSign size={22} />} value={`$${stats.current_month_cost || 0}`} label="Costo estimado" color="warning" />
        <StatCard icon={<Cpu size={22} />} value={stats.total_devices || 0} label="Dispositivos registrados" color="info" />
        <StatCard icon={<Bell size={22} />} value={stats.unread_alerts || 0} label="Alertas sin leer" color="danger" />
      </div>

      <div className="dashboard-charts" style={{ marginBottom: 24 }}>
        <PageSection icon={<TrendingUp size={18} />} title="Consumo diario" subtitle="Últimos 7 días" style={{ marginBottom: 0 }}>
          <LineChart data={daily} xKey="date" yKey="consumption" title="" />
        </PageSection>
        <PageSection icon={<TrendingUp size={18} />} title="Consumo mensual" subtitle="Últimos 12 meses" style={{ marginBottom: 0 }}>
          <BarChart data={monthly} xKey="month" yKey="consumption" title="" />
        </PageSection>
      </div>

      <div className="dashboard-charts">
        <PageSection icon={<Cpu size={18} />} title="Desglose por categoría" subtitle="Participación de cada categoría en el consumo" style={{ marginBottom: 0 }}>
          <PieChart data={breakdown} nameKey="name" valueKey="value" title="" />
        </PageSection>
        <PageSection
          icon={<Bell size={18} />}
          title="Alertas recientes"
          subtitle="Últimas notificaciones de tu cuenta"
          style={{ marginBottom: 0 }}
          actions={alerts.length > 0 && <Link to="/alerts" className="btn btn-sm btn-secondary">Ver todas</Link>}
        >
          {alerts.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin alertas recientes 🎉</p>}
          {alerts.map(a => (
            <div key={a.id || a._id} className={`alert-item ${a.is_read ? 'read' : 'unread'}`}>
              <div className={`alert-dot ${a.severity || 'info'}`}></div>
              <div className="alert-content">
                <div className="alert-title">{a.title}</div>
                <div className="alert-message">{a.message}</div>
                <div className="alert-time">{new Date(a.created_at || a.createdAt).toLocaleString('es-AR')}</div>
              </div>
            </div>
          ))}
        </PageSection>
      </div>
    </div>
  );
}
