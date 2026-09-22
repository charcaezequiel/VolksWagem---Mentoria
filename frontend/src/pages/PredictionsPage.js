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
import { useTranslation } from '../context/LanguageContext';

export default function PredictionsPage() {
  const { t, lang } = useTranslation();
  const [forecast, setForecast] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const locale = lang === 'en' ? 'en-US' : 'es-AR';

  const fmtForecast = (v) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(v || 0);

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
      toast.error(err.response?.data?.error || t('predictions.error'));
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
      toast.success(t('predictions.recalculated'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('predictions.recalc_error'));
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
    { header: t('predictions.col_range'), key: 'tier', render: (_, r) => `${r.tier_from} - ${r.tier_to != null ? r.tier_to : '+'} kWh` },
    { header: t('predictions.col_kwh_tier'), key: 'kwh_in_tier' },
    { header: t('predictions.col_price'), key: 'price', render: (v) => fmtForecast(v) },
    { header: t('predictions.col_subtotal'), key: 'subtotal', render: (v) => fmtForecast(v) },
  ];

  const monthColumns = [
    { header: t('predictions.col_month'), key: 'label' },
    { header: t('predictions.col_kwh'), key: 'total_kwh', render: (v) => `${v} kWh` },
    { header: t('predictions.col_cost'), key: 'cost', render: (v) => fmtForecast(v) },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><Brain size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('predictions.title')}</h2>
          <p className="page-header-subtitle">{t('predictions.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={handleRegenerate} disabled={regenerating}>
          <RefreshCw size={16} className={regenerating ? 'spinning' : ''} />
          {regenerating ? t('predictions.recalculating') : t('predictions.recalculate')}
        </button>
      </div>

      {loading ? <LoadingSpinner /> : !forecast ? (
        <div className="card empty-state" style={{ padding: 60 }}>
          <Zap size={40} />
          <p>{t('predictions.empty')}</p>
          <button className="btn btn-primary" onClick={load}>{t('predictions.retry')}</button>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <StatCard
              icon={<Wallet size={20} />}
              value={fmtForecast(forecast.predicted_cost)}
              label={t('predictions.bill_estimated', { month: forecast.month_name, year: forecast.year })}
              change={costChange}
              color="primary"
            />
            <StatCard
              icon={<Zap size={20} />}
              value={`${forecast.total_predicted_kwh} kWh`}
              label={t('predictions.consumption_estimated')}
              color="warning"
            />
            <StatCard
              icon={<CalendarDays size={20} />}
              value={`${forecast.avg_daily_kwh} kWh`}
              label={t('predictions.daily_avg')}
              color="info"
            />
            <StatCard
              icon={<ShieldCheck size={20} />}
              value={`${Math.round(forecast.confidence_score * 100)}%`}
              label={t('predictions.confidence')}
              color="danger"
            />
          </div>

          <div className="dashboard-charts" style={{ marginBottom: 24 }}>
            <PageSection icon={<TrendingUp size={18} />} title={t('predictions.daily_forecast', { month: forecast.month_name, year: forecast.year })} subtitle={`${forecast.province} · ${forecast.distributor} · Modelo ${forecast.model_version}`} style={{ marginBottom: 0 }}>
              {dailyChartData.length > 0 && (
                <LineChart data={dailyChartData} xKey="date" yKey="kwh" color="#8b5cf6" />
              )}
            </PageSection>
            <PageSection icon={<Scale size={18} />} title={t('predictions.monthly_comparison')} subtitle={t('predictions.monthly_comparison_sub')} style={{ marginBottom: 0 }}>
              {monthChartData.length > 0 && (
                <BarChart data={monthChartData} xKey="month" yKey="consumption" color="#10b981" />
              )}
            </PageSection>
          </div>

          <div className="dashboard-charts">
            <PageSection icon={<Wallet size={18} />} title={t('predictions.bill_breakdown')} subtitle={t('predictions.bill_breakdown_sub')} style={{ marginBottom: 0 }}>
              <DataTable columns={breakdownColumns} data={forecast.cost_breakdown || []} emptyMessage={t('predictions.empty_breakdown')} />
              <div className="forecast-total">
                <span>{t('predictions.total_estimated')}</span>
                <span>{fmtForecast(forecast.predicted_cost)}</span>
              </div>
              <p className="forecast-meta">
                {t('predictions.avg_price')} {fmtForecast(forecast.price_per_kwh_avg)}/kWh — {t('predictions.peak_day')} {forecast.peak_day_kwh} kWh ({forecast.peak_day_date})
              </p>
            </PageSection>
            <PageSection icon={<Target size={18} />} title={t('predictions.months_vs_forecast')} subtitle={t('predictions.months_vs_sub')} style={{ marginBottom: 0 }}>
              <DataTable columns={monthColumns} data={forecast.month_comparison || []} emptyMessage={t('predictions.empty_months')} />
            </PageSection>
          </div>

          {accuracy && accuracy.accuracy != null && (
            <PageSection
              icon={<ShieldCheck size={18} />}
              title={t('predictions.model_accuracy')}
              subtitle={t('predictions.accuracy_sub')}
              style={{ marginBottom: 24 }}
            >
              <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{accuracy.accuracy}%</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('predictions.accuracy_label')} ({accuracy.samples} {t('predictions.samples')})</div>
                </div>
                {accuracy.mape !== undefined && (
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{accuracy.mape}%</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('predictions.mape')}</div>
                  </div>
                )}
              </div>
            </PageSection>
          )}

          {anomalies.length > 0 && (
            <PageSection
              icon={<AlertTriangle size={18} />}
              title={t('predictions.anomalies_title')}
              subtitle={t('predictions.anomalies_sub')}
            >
              {anomalies.map((a, i) => (
                <div key={i} className="alert-item unread">
                  <div className="alert-dot warning"></div>
                  <div className="alert-content">
                    <div className="alert-title">{a.description || a.message || t('predictions.anomaly_default')}</div>
                    <div className="alert-message">{t('predictions.anomaly_value', { value: a.value || a.kwh || 'N/A', expected: a.expected || 'N/A' })}</div>
                    <div className="alert-time">{a.date || a.timestamp ? new Date(a.date || a.timestamp).toLocaleDateString(locale) : ''}</div>
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
