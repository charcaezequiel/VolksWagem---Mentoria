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

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.devices.getReadings(id, { limit: 100 });
      setDevice(res.data.device);
      setReadings(res.data.readings || []);
      setStats(res.data.stats || null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar el dispositivo');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const copyToken = () => {
    if (!device?.device_token) return;
    navigator.clipboard.writeText(device.device_token);
    toast.success('Token copiado');
  };

  const regenerateToken = async () => {
    if (!window.confirm('¿Regenerar el token del sensor? El dispositivo actual dejará de funcionar hasta que cargues el nuevo token.')) return;
    try {
      const res = await api.devices.regenerateToken(id);
      setDevice(res.data.device);
      toast.success('Token regenerado');
    } catch {
      toast.error('Error al regenerar el token');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!device) return null;

  const chartData = [...readings].reverse().map((r) => ({
    time: new Date(r.reading_timestamp).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    watts: r.instant_watts,
    kwh: r.accumulated_kwh_day || 0,
  }));

  const columns = [
    { header: 'Fecha', key: 'reading_timestamp', render: (v) => new Date(v).toLocaleString('es-AR') },
    { header: 'Potencia (W)', key: 'instant_watts' },
    { header: 'kWh del día', key: 'accumulated_kwh_day', render: (v) => v ?? '—' },
    { header: 'Tensión (V)', key: 'voltage', render: (v) => v ?? '—' },
    { header: 'Corriente (A)', key: 'current', render: (v) => v ?? '—' },
    { header: 'Frecuencia (Hz)', key: 'frequency', render: (v) => v ?? '—' },
    { header: 'Factor de potencia', key: 'power_factor', render: (v) => v ?? '—' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/devices" className="btn btn-sm btn-secondary"><ArrowLeft size={14} /> Volver</Link>
          <h2 style={{ margin: 0 }}><Cpu size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{device.name}</h2>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <StatCard
          icon={<Zap size={20} />}
          value={stats?.last_watts != null ? `${stats.last_watts} W` : '—'}
          label="Potencia actual"
          color="primary"
        />
        <StatCard
          icon={<Activity size={20} />}
          value={`${stats?.month_kwh ?? 0} kWh`}
          label="Consumo del mes"
          color="warning"
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          value={stats?.last_reading_at ? new Date(stats.last_reading_at).toLocaleDateString('es-AR') : 'Sin datos'}
          label="Última medición"
          color="info"
        />
        <StatCard
          icon={stats?.is_online ? <Wifi size={20} /> : <WifiOff size={20} />}
          value={!device.device_token ? 'Sin sensor' : stats?.is_online ? 'En linea' : 'Sin conexion'}
          label={!device.device_token ? 'No hay sensor configurado' : 'Estado del sensor'}
          color={!device.device_token ? 'warning' : stats?.is_online ? 'primary' : 'danger'}
        />
      </div>

      <PageSection
        icon={<KeyRound size={18} />}
        title={!device.device_token ? "Sensor no conectado" : "Conectar tu sensor ESP32 + PZEM-004T"}
        subtitle={!device.device_token
          ? "Este dispositivo no tiene un sensor IoT configurado. Genera un token y cargalo en el sketch de Arduino para empezar a medir."
          : "Copiá el token del dispositivo y pegálo en el sketch de Arduino. El sensor envía lecturas automáticamente a la base de datos."
        }
        style={{ marginBottom: 24 }}
      >
        <div className="device-token-row">
          <code className="device-token">{device.device_token || 'Sin token — regeneralo'}</code>
          <button className="btn btn-sm btn-secondary" onClick={copyToken}><Copy size={14} /> Copiar</button>
          <button className="btn btn-sm btn-danger" onClick={regenerateToken}><RefreshCw size={14} /> Regenerar</button>
        </div>
        <div className="device-token-help">
          <strong>ID del dispositivo:</strong> <code>{device.id}</code>
        </div>
        <p className="device-token-help">
          Endpoint: <code>POST /api/sensor/readings</code> con header <code>Authorization: Bearer &lt;token&gt;</code>.
        </p>
      </PageSection>

      {chartData.length > 0 && (
        <PageSection
          icon={<Activity size={18} />}
          title={`Consumo de ${device.name} (W)`}
          subtitle="Potencia instantánea registrada por el sensor"
          style={{ marginBottom: 24 }}
        >
          <LineChart data={chartData} xKey="time" yKey="watts" color="#8b5cf6" title="" />
        </PageSection>
      )}

      <PageSection
        icon={<Activity size={18} />}
        title="Historial de lecturas"
        subtitle="Últimas mediciones enviadas por el sensor"
      >
        <DataTable columns={columns} data={readings} emptyMessage="Todavía no hay lecturas para este dispositivo" />
      </PageSection>
    </div>
  );
}
