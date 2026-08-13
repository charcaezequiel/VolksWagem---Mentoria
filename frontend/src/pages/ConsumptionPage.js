import React, { useState, useEffect } from 'react';
import { Zap, Activity, Plus, Cpu, CalendarRange } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import StatCard from '../components/common/StatCard';
import BarChart from '../components/charts/BarChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageSection from '../components/common/PageSection';
import Modal from '../components/common/Modal';
import Field from '../components/common/Field';
import toast from 'react-hot-toast';

export default function ConsumptionPage() {
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [byDevice, setByDevice] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ device_id: '', instant_watts: '', accumulated_kwh_day: '', reading_timestamp: '', source: 'manual' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const [rRes, sRes, rtRes, bdRes, dRes] = await Promise.all([
        api.consumption.getReadings(params),
        api.consumption.getSummary(params),
        api.consumption.getRealtime().catch(() => ({ data: null })),
        api.consumption.getByDevice(params),
        api.devices.getAll(),
      ]);
      setReadings(rRes.data.readings || rRes.data || []);
      setSummary(sRes.data);
      setRealtime(rtRes.data);
      setByDevice(bdRes.data.by_device || bdRes.data.data || bdRes.data || []);
      setDevices(dRes.data.devices || dRes.data || []);
    } catch { toast.error('Error al cargar consumo'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddReading = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.consumption.addReading(form);
      toast.success('Lectura registrada correctamente');
      setShowForm(false);
      setForm({ device_id: '', instant_watts: '', accumulated_kwh_day: '', reading_timestamp: '', source: 'manual' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar lectura');
    }
    setSaving(false);
  };

  const columns = [
    { header: 'Fecha', key: 'reading_timestamp', render: (v) => (
      <span className="table-mono">{new Date(v).toLocaleString('es-AR')}</span>
    ) },
    { header: 'Dispositivo', key: 'device', render: (_, r) => r.device?.name || (r.device_id ? <code className="table-code">{r.device_id}</code> : '—') },
    { header: 'Watts', key: 'instant_watts', render: (v) => <span className="table-mono"><strong>{v ?? '—'}</strong> W</span> },
    { header: 'kWh Acumulado', key: 'accumulated_kwh_day', render: (v) => <span className="table-mono">{v ?? '—'}</span> },
    { header: 'Fuente', key: 'source', render: (v) => v === 'sensor' ? <span className="badge badge-success">{v}</span> : v === 'estimated' ? <span className="badge badge-warning">{v}</span> : <span className="badge badge-info">{v}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><Zap size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Consumo Energético</h2>
          <p className="page-header-subtitle">Registrá lecturas y analizá el consumo de cada dispositivo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Agregar Lectura
        </button>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {realtime ? (
          <div className="stat-card stat-card-primary">
            <div className="stat-card-icon"><Activity size={22} /></div>
            <div className="stat-card-content">
              <h3 className="stat-card-value">{realtime.instant_watts || realtime.currentWatts || 0} W</h3>
              <p className="stat-card-label">Consumo actual</p>
            </div>
          </div>
        ) : (
          <StatCard icon={<Activity size={22} />} value="—" label="Consumo actual" color="primary" />
        )}
        {summary && (
          <>
            <StatCard icon={<Zap size={22} />} value={`${summary.daily || 0} kWh`} label="Promedio diario" color="primary" />
            <StatCard icon={<Zap size={22} />} value={`${summary.weekly || 0} kWh`} label="Esta semana" color="info" />
            <StatCard icon={<Zap size={22} />} value={`${summary.monthly || 0} kWh`} label="Este mes" color="warning" />
          </>
        )}
      </div>

      {byDevice.length > 0 && (
        <PageSection
          icon={<Cpu size={18} />}
          title="Consumo por dispositivo"
          subtitle="kWh consumidos por cada electrodoméstico en el período seleccionado."
          style={{ marginBottom: 24 }}
        >
          <BarChart data={byDevice} xKey="name" yKey="consumption" title="" />
        </PageSection>
      )}

      <PageSection
        icon={<CalendarRange size={18} />}
        title="Historial de lecturas"
        subtitle="Filtrá por fecha y revisá todas las mediciones registradas."
        actions={
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <input className="form-input form-input-sm" type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
            <input className="form-input form-input-sm" type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
            <button className="btn btn-sm btn-secondary" onClick={load}>Filtrar</button>
          </div>
        }
      >
        {loading ? <LoadingSpinner /> : <DataTable columns={columns} data={readings} emptyMessage="No hay lecturas registradas" />}
      </PageSection>

      {showForm && (
        <Modal
          title="Agregar lectura de consumo"
          subtitle="Ingresá la medición del dispositivo"
          icon={<Zap size={18} />}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleAddReading}>
            <div className="form-group">
              <Field label="Dispositivo" icon={<Cpu size={15} />} hint="Opcional si la medición es general del hogar.">
                <select className="form-select" value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })}>
                  <option value="">Medición general (sin dispositivo)</option>
                  {devices.map((d) => <option key={d.id || d._id} value={d.id || d._id}>{d.name} · {d.nominal_watts} W</option>)}
                </select>
              </Field>
            </div>
            <div className="form-group">
              <Field label="Consumo instantáneo (Watts)" icon={<Zap size={15} />} required hint="Potencia que está consumiendo ahora mismo.">
                <input className="form-input" type="number" step="0.01" min="0" value={form.instant_watts} onChange={(e) => setForm({ ...form, instant_watts: e.target.value })} required placeholder="Ej.: 1500" />
              </Field>
            </div>
            <div className="form-group">
              <Field label="kWh acumulados del día" icon={<Activity size={15} />} hint="Energía acumulada en la jornada (opcional).">
                <input className="form-input" type="number" step="0.01" min="0" value={form.accumulated_kwh_day} onChange={(e) => setForm({ ...form, accumulated_kwh_day: e.target.value })} placeholder="Ej.: 4.5" />
              </Field>
            </div>
            <div className="form-group">
              <Field label="Fecha y hora" icon={<CalendarRange size={15} />} hint="Por defecto se toma la fecha actual.">
                <input className="form-input" type="datetime-local" value={form.reading_timestamp} onChange={(e) => setForm({ ...form, reading_timestamp: e.target.value })} />
              </Field>
            </div>
            <div className="form-group">
              <Field label="Fuente de la medición" icon={<Activity size={15} />}>
                <select className="form-select" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="manual">Manual</option>
                  <option value="sensor">Sensor IoT</option>
                  <option value="estimated">Estimado</option>
                </select>
              </Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar lectura'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
