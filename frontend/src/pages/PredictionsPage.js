import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, AlertTriangle, Wallet, Zap, CalendarDays, ShieldCheck, TrendingUp, Scale, Target } from 'lucide-react';
import { api } from '../services/api';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import DataTable from '../components/common/DataTable';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageSection from '../components/common/PageSection';
import toast from 'react-hot-toast';

const formatARS = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(value || 0);

export default function PredictionsPage() {
  const [forecast, setForecast] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [fRes, aRes, anRes] = await Promise.all([
        api.predictions.getBillForecast(),
        api.predictions.getAccuracy().catch(() => ({ data: null })),
        api.predictions.detectAnomalies().catch(() => ({ data: { anomalies: [] } })),
      ]);
      setForecast(fRes.data.forecast || fRes.data || null);
      setAccuracy(aRes.data);
      setAnomalies(anRes.data.anomalies || anRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar el pronóstico');
      setForecast(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const fRes = await api.predictions.getBillForecast();
      setForecast(fRes.data.forecast || fRes.data || null);
      toast.success('Pronóstico recalculado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al recalcular');
    }
    setRegenerating(false);
  };

  const dailyChartData = (forecast?.daily_forecast || []).map((day) => ({
    date: day.date,
    kwh: day.kwh,
  }));

  const monthChartData = (forecast?.month_comparison || []).map((m) => ({
    month: m.label,
    consumption: m.total_kwh,
  }));

  const lastFullMonth = forecast?.month_comparison?.[2];
  const costChange = lastFullMonth?.cost > 0
    ? Math.round(((forecast.predicted_cost - lastFullMonth.cost) / lastFullMonth.cost) * 100 * 10) / 10
    : undefined;

  const breakdownColumns = [
    { header: 'Rango', key: 'tier', render: (_, r) => `${r.tier_from} - ${r.tier_to != null ? r.tier_to : '+'} kWh` },
    { header: 'kWh en rango', key: 'kwh_in_tier' },
    { header: '$/kWh', key: 'price', render: (v) => formatARS(v) },
    { header: 'Subtotal', key: 'subtotal', render: (v) => formatARS(v) },
  ];

  const monthColumns = [
    { header: 'Mes', key: 'label' },
    { header: 'kWh', key: 'total_kwh', render: (v) => `${v} kWh` },
    { header: 'Costo', key: 'cost', render: (v) => formatARS(v) },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><Brain size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Predicción de Boleta — IA</h2>
          <p className="page-header-subtitle">Estimación de tu consumo y costo del próximo mes con el modelo de predicción.</p>
        </div>
        <button className="btn btn-primary" onClick={handleRegenerate} disabled={regenerating}>
          <RefreshCw size={16} className={regenerating ? 'spinning' : ''} />
          {regenerating ? 'Recalculando...' : 'Recalcular Pronóstico'}
        </button>
      </div>

      {loading ? <LoadingSpinner /> : !forecast ? (
        <div className="card empty-state" style={{ padding: 60 }}>
          <Zap size={40} />
          <p>No hay datos suficientes para generar el pronóstico. Asegurate de tener tu provincia configurada y datos de consumo cargados.</p>
          <button className="btn btn-primary" onClick={load}>Reintentar</button>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <StatCard
              icon={<Wallet size={20} />}
              value={formatARS(forecast.predicted_cost)}
              label={`Boleta estimada — ${forecast.month_name} ${forecast.year}`}
              change={costChange}
              color="primary"
            />
            <StatCard
              icon={<Zap size={20} />}
              value={`${forecast.total_predicted_kwh} kWh`}
              label="Consumo estimado del mes"
              color="warning"
            />
            <StatCard
              icon={<CalendarDays size={20} />}
              value={`${forecast.avg_daily_kwh} kWh`}
              label="Promedio diario estimado"
              color="info"
            />
            <StatCard
              icon={<ShieldCheck size={20} />}
              value={`${Math.round(forecast.confidence_score * 100)}%`}
              label="Confianza del modelo"
              color="danger"
            />
          </div>

          <div className="dashboard-charts" style={{ marginBottom: 24 }}>
            <PageSection icon={<TrendingUp size={18} />} title={`Pronóstico diario — ${forecast.month_name} ${forecast.year}`} subtitle={`${forecast.province} · ${forecast.distributor} · Modelo ${forecast.model_version}`} style={{ marginBottom: 0 }}>
              {dailyChartData.length > 0 && (
                <LineChart data={dailyChartData} xKey="date" yKey="kwh" color="#8b5cf6" />
              )}
            </PageSection>
            <PageSection icon={<Scale size={18} />} title="Comparación mensual (kWh)" subtitle="Últimos meses contra el mes pronosticado" style={{ marginBottom: 0 }}>
              {monthChartData.length > 0 && (
                <BarChart data={monthChartData} xKey="month" yKey="consumption" color="#10b981" />
              )}
            </PageSection>
          </div>

          <div className="dashboard-charts">
            <PageSection icon={<Wallet size={18} />} title="Desglose de la boleta estimada" subtitle="Cálculo por rango tarifario de tu provincia" style={{ marginBottom: 0 }}>
              <DataTable columns={breakdownColumns} data={forecast.cost_breakdown || []} emptyMessage="Sin desglose disponible" />
              <div className="forecast-total">
                <span>Total estimado</span>
                <span>{formatARS(forecast.predicted_cost)}</span>
              </div>
              <p className="forecast-meta">
                Tarifa promedio: {formatARS(forecast.price_per_kwh_avg)}/kWh — Pico diario: {forecast.peak_day_kwh} kWh ({forecast.peak_day_date})
              </p>
            </PageSection>
            <PageSection icon={<Target size={18} />} title="Últimos meses vs. pronóstico" subtitle="Consumo y costo de períodos anteriores" style={{ marginBottom: 0 }}>
              <DataTable columns={monthColumns} data={forecast.month_comparison || []} emptyMessage="Sin datos de meses anteriores" />
            </PageSection>
          </div>

          {accuracy && accuracy.accuracy != null && (
            <PageSection
              icon={<ShieldCheck size={18} />}
              title="Precisión del modelo"
              subtitle="Qué tan cerca estuvo el pronóstico de lo real"
              style={{ marginBottom: 24 }}
            >
              <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{accuracy.accuracy}%</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Precisión ({accuracy.samples} muestras)</div>
                </div>
                {accuracy.mape !== undefined && (
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{accuracy.mape}%</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Error (MAPE)</div>
                  </div>
                )}
              </div>
            </PageSection>
          )}

          {anomalies.length > 0 && (
            <PageSection
              icon={<AlertTriangle size={18} />}
              title="Anomalías detectadas"
              subtitle="Días con consumo fuera de lo esperado"
            >
              {anomalies.map((a, i) => (
                <div key={i} className="alert-item unread">
                  <div className="alert-dot warning"></div>
                  <div className="alert-content">
                    <div className="alert-title">{a.description || a.message || 'Anomalía detectada'}</div>
                    <div className="alert-message">Valor: {a.value || a.kwh || 'N/A'} — Esperado: {a.expected || 'N/A'}</div>
                    <div className="alert-time">{a.date || a.timestamp ? new Date(a.date || a.timestamp).toLocaleDateString('es-AR') : ''}</div>
                  </div>
                </div>
              ))}
            </PageSection>
          )}
        </>
      )}
    </div>
  );
}
