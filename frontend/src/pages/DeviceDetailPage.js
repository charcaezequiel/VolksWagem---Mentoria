import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, RefreshCw, Zap, Wifi, WifiOff, Activity, Cpu, CalendarDays, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/common/StatCard';
import PageSection from '../components/common/PageSection';
import LineChart from '../components/charts/LineChart';
import DataTable from '../components/common/DataTable';
import toast from 'react-hot-toast';
import { useTranslation } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [stats, setStats] = useState(null);
  const [liveReading, setLiveReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const { connected, on } = useSocket();
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'es-AR';

  const load = async () => {
    setLoading(true);
    try {
      const [deviceRes, readingsRes] = await Promise.all([
        api.devices.getById(id).catch(() => null),
        api.devices.getReadings(id, { limit: 100 }),
      ]);
      const deviceData = deviceRes?.data?.device || deviceRes?.data || null;
      const readingsData = readingsRes.data;
      setDevice(deviceData || readingsData.device);
      setReadings(readingsData.readings || []);
      setStats(readingsData.stats || null);
    } catch (err) {
      toast.error(err.response?.data?.error || t('devices.error'));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  // Tiempo real: cada lectura del sensor de ESTE dispositivo actualiza la
  // potencia actual, la fecha de última medición y el historial al instante.
  useEffect(() => {
    const off = on('reading:new', (payload) => {
      const r = payload?.reading;
      if (!r || !r.device_id || r.device_id !== id) return;
      setLiveReading(r);
      setStats((prev) => ({
        ...(prev || {}),
        last_watts: r.instant_watts,
        last_reading_at: r.reading_timestamp,
        is_online: true,
      }));
      setReadings((prev) => [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 100));
    });
    return off;
  }, [on, id]);

  const copyToken = () => {
    if (!device?.device_token) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(device.device_token);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = device.device_token;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    toast.success(t('device.token_copied'));
  };

  const regenerateToken = async () => {
    if (!window.confirm(t('device.token_confirm'))) return;
    try {
      const res = await api.devices.regenerateToken(id);
      setDevice(res.data.device);
      toast.success(t('device.token_regenerated'));
    } catch {
      toast.error(t('device.token_error'));
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!device) return null;

  const chartData = [...readings].reverse().map((r) => ({
    time: new Date(r.reading_timestamp).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    watts: r.instant_watts,
    kwh: r.accumulated_kwh_day || 0,
  }));

  const columns = [
    { header: t('device.col_date'), key: 'reading_timestamp', render: (v) => new Date(v).toLocaleString(locale) },
    { header: t('device.col_power'), key: 'instant_watts' },
    { header: t('device.col_kwh_day'), key: 'accumulated_kwh_day', render: (v) => v ?? '—' },
    { header: t('device.col_voltage'), key: 'voltage', render: (v) => v ?? '—' },
    { header: t('device.col_current'), key: 'current', render: (v) => v ?? '—' },
    { header: t('device.col_frequency'), key: 'frequency', render: (v) => v ?? '—' },
    { header: t('device.col_pf'), key: 'power_factor', render: (v) => v ?? '—' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/devices" className="btn btn-sm btn-secondary"><ArrowLeft size={14} /> {t('device.back')}</Link>
          <h2 style={{ margin: 0 }}><Cpu size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{device.name}</h2>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <StatCard
          icon={<Zap size={20} />}
          value={liveReading?.instant_watts != null ? `${Math.round(Number(liveReading.instant_watts))} W` : (stats?.last_watts != null ? `${stats.last_watts} W` : '—')}
          label={<span className="stat-card-label-with-dot">{t('device.power_current')}{connected && <span className="stat-live-dot" title={t('consumption.live')} />}</span>}
          color="primary"
        />
        <StatCard
          icon={<Activity size={20} />}
          value={`${stats?.month_kwh ?? 0} kWh`}
          label={t('device.consumption_month')}
          color="warning"
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          value={liveReading?.reading_timestamp ? new Date(liveReading.reading_timestamp).toLocaleString(locale) : (stats?.last_reading_at ? new Date(stats.last_reading_at).toLocaleString(locale) : t('device.no_data'))}
          label={t('device.last_measurement')}
          color="info"
        />
        <StatCard
          icon={stats?.is_online ? <Wifi size={20} /> : <WifiOff size={20} />}
          value={!device.device_token ? t('device.sensor_no_device') : stats?.is_online ? t('device.sensor_online_label') : t('device.sensor_offline_label')}
          label={!device.device_token ? t('device.sensor_no_config') : t('device.sensor_status')}
          color={!device.device_token ? 'warning' : stats?.is_online ? 'primary' : 'danger'}
        />
      </div>

      <PageSection
        icon={<KeyRound size={18} />}
        title={!device.device_token ? t('device.sensor_not_connected') : t('device.sensor_connected_title')}
        subtitle={!device.device_token
          ? t('device.sensor_not_connected_desc')
          : t('device.sensor_connected_desc')
        }
        style={{ marginBottom: 24 }}
      >
        <div className="device-token-row">
          <code className="device-token">{device.device_token || t('device.no_token')}</code>
          <button className="btn btn-sm btn-secondary" onClick={copyToken}><Copy size={14} /> {t('device.copy')}</button>
          <button className="btn btn-sm btn-danger" onClick={regenerateToken}><RefreshCw size={14} /> {t('device.regenerate')}</button>
        </div>
        <div className="device-token-help">
          <strong>{t('device.device_id')}</strong> <code>{device.id}</code>
        </div>
        <p className="device-token-help">
          {t('device.endpoint_hint')}
        </p>
      </PageSection>

      {chartData.length > 0 && (
        <PageSection
          icon={<Activity size={18} />}
          title={t('device.chart_title', { name: device.name })}
          subtitle={t('device.chart_subtitle')}
          style={{ marginBottom: 24 }}
        >
          <LineChart data={chartData} xKey="time" yKey="watts" color="#8b5cf6" title="" />
        </PageSection>
      )}

      <PageSection
        icon={<Activity size={18} />}
        title={t('device.readings_title')}
        subtitle={t('device.readings_subtitle')}
      >
        <DataTable columns={columns} data={readings} emptyMessage={t('device.readings_empty')} />
      </PageSection>
    </div>
  );
}
