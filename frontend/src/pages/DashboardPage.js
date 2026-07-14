import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, DollarSign, Cpu, Bell } from 'lucide-react';
import { api } from '../services/api';
import StatCard from '../components/common/StatCard';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (loading) return <LoadingSpinner />;

  const stats = overview || {};

  return (
    <div>
      <div className="dashboard-grid">
        <StatCard icon={<Zap size={24} />} value={`${stats.current_month_kwh || 0} kWh`} label="Consumo Mes Actual" change={stats.comparison_percentage} color="primary" />
        <StatCard icon={<DollarSign size={24} />} value={`$${stats.current_month_cost || 0}`} label="Costo Estimado" color="warning" />
        <StatCard icon={<Cpu size={24} />} value={stats.total_devices || 0} label="Dispositivos" color="info" />
        <StatCard icon={<Bell size={24} />} value={stats.unread_alerts || 0} label="Alertas Sin Leer" color="danger" />
      </div>

      <div className="quick-actions">
        <Link to="/consumption" className="btn btn-primary">⚡ Agregar Lectura</Link>
        <Link to="/predictions" className="btn btn-secondary">🔮 Ver Predicciones</Link>
        <Link to="/devices" className="btn btn-secondary">⚙️ Administrar Dispositivos</Link>
      </div>

      <div className="dashboard-charts">
        <LineChart data={daily} xKey="date" yKey="consumption" title="Consumo Diario (últimos 7 días)" />
        <BarChart data={monthly} xKey="month" yKey="consumption" title="Consumo Mensual (últimos 12 meses)" />
      </div>

      <div className="dashboard-charts">
        <PieChart data={breakdown} nameKey="name" valueKey="value" title="Desglose por Dispositivo" />
        <div className="card">
          <h3 className="chart-title">Alertas Recientes</h3>
          {alerts.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin alertas recientes</p>}
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
          {alerts.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Link to="/alerts" className="btn btn-sm btn-secondary">Ver todas las alertas</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
