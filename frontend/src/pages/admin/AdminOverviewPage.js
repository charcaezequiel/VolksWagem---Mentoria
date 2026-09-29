import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/** Los errores de red se muestran aca, no en un toast: si /admin/stats falla
 *  la pantalla queda vacia y el admin necesita saber POR QUE. */
function ErrorNote({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="admin-error" role="alert">
      <AlertTriangle size={18} />
      <span>{error}</span>
      <button type="button" onClick={onRetry}>{t('admin.refresh')}</button>    </div>
  );
}

const StatCard = ({ label, value, accent = 1, hint }) => (
  <div className={`admin-stat admin-stat-accent-${accent}`}>
    <span className="admin-stat-label">{label}</span>
    <span className="admin-stat-value">{value ?? '—'}</span>
    {hint && <span className="admin-stat-hint">{hint}</span>}
  </div>
);

/* Barras horizontales puras en CSS en vez de un grafico: la comparacion es
   "cuanto mas alto mas cuentas", y una barra directa se lee sin eje ni
   tooltip. */
const RankedBars = ({ items, emptyLabel, valueKey = 'count', format }) => {
  if (!items?.length) return <p className="admin-empty">{emptyLabel}</p>;
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0)) || 1;
  return (
    <ul className="admin-bars">
      {items.map((item) => (
        <li key={item.label} className="admin-bar">
          <span className="admin-bar-label" title={item.label}>{item.label}</span>
          <span className="admin-bar-track">
            <span
              className="admin-bar-fill"
              style={{ width: `${Math.max(2, ((Number(item[valueKey]) || 0) / max) * 100)}%` }}
            />
          </span>
          <span className="admin-bar-value">{format ? format(item[valueKey]) : item[valueKey]}</span>
        </li>
      ))}
    </ul>
  );
};

export default function AdminOverviewPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, p] = await Promise.all([
        api.admin.getStats(),
        api.admin.getConsumptionByProvince({ days: 30 }),
      ]);
      setStats(s.data);
      setProvinces(p.data.series || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const totals = stats?.totals || {};
  const byType = (stats?.distribution?.by_type || []).map((r) => ({
    label: r.user_type, count: r.count,
  }));
  const byProvince = (stats?.distribution?.by_province || []).map((r) => ({
    label: r.province?.name || '—', count: r.count,
  }));
  const topConsumers = (stats?.top_consumers || []).map((r) => ({
    label: r.user?.name || r.user?.email || '—',
    kwh: Number(r.total_kwh) || 0,
  }));

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h2>{t('admin.tab.overview')}</h2>
        <button type="button" className="btn btn-ghost" onClick={load}>
          <RefreshCw size={15} /> {t('admin.refresh')}
        </button>
      </div>

      {error && <ErrorNote error={error} onRetry={load} />}

      <div className="admin-stats">
        {/* "Clientes" y no "Usuarios": el conteo excluye a los administradores
            (lo filtra el backend con role:'user'), asi que el numero que se ve
            aca es el de gente a la que se le factura. Los administradores se
            informan aparte, en la propia pista de la tarjeta. */}
        <StatCard
          accent={1}
          label={t('admin.stat.customers')}
          value={totals.users}
          hint={`${totals.active_users} ${t('admin.stat.active_users').toLowerCase()}`}
        />
        <StatCard
          accent={4}
          label={t('admin.stat.admins')}
          value={totals.admins}
          hint={t('admin.stat.admins_hint')}
        />
        <StatCard accent={3} label={t('admin.stat.devices')} value={totals.devices} hint={`${totals.online_devices} ${t('admin.stat.online_devices').toLowerCase()}`} />
        <StatCard accent={2} label={t('admin.stat.tariffs')} value={totals.tariffs} hint={`${totals.provinces_with_tariffs} provincias`} />
        <StatCard accent={4} label={t('admin.stat.readings_24h')} value={totals.readings_24h} hint={`${totals.readings_30d} / 30 d`} />
        <StatCard accent={1} label={t('admin.stat.alerts')} value={totals.unread_alerts} hint={`${totals.alerts} ${t('admin.stat.alerts').toLowerCase()}`} />
        <StatCard accent={2} label={t('admin.stat.categories')} value={totals.categories} hint={`${totals.appliances} ${t('admin.stat.appliances').toLowerCase()}`} />
        <StatCard accent={3} label={t('admin.stat.predictions')} value={totals.predictions} />
        <StatCard accent={4} label={t('admin.stat.recommendations')} value={totals.recommendations} />
      </div>

      <div className="admin-grid-2">
        <section className="admin-card">
          <h3>{t('admin.by_type')}</h3>
          <RankedBars items={byType} emptyLabel={t('common.no_data')} />
        </section>

        <section className="admin-card">
          <h3>{t('admin.by_province')}</h3>
          <RankedBars items={byProvince} emptyLabel={t('common.no_data')} />
        </section>

        <section className="admin-card">
          <h3>{t('admin.top_consumers')}</h3>
          <RankedBars items={topConsumers} valueKey="kwh" emptyLabel={t('common.no_data')} format={(v) => `${Number(v).toFixed(1)} kWh`} />
        </section>

        <section className="admin-card">
          <h3>{t('admin.consumption_by_province')}</h3>
          <RankedBars items={provinces} valueKey="kwh" emptyLabel={t('common.no_data')} format={(v) => `${Number(v).toFixed(1)} kWh`} />
        </section>
      </div>
    </div>
  );
}
