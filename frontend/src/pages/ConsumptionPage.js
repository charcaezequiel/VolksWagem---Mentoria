import React, { useState, useEffect } from 'react';
import { Zap, Activity } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import StatCard from '../components/common/StatCard';
import BarChart from '../components/charts/BarChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ConsumptionPage() {
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [byDevice, setByDevice] = useState([]);
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
      const [rRes, sRes, rtRes, bdRes] = await Promise.all([
        api.consumption.getReadings(params),
        api.consumption.getSummary(params),
        api.consumption.getRealtime().catch(() => ({ data: null })),
        api.consumption.getByDevice(params),
      ]);
      setReadings(rRes.data.readings || rRes.data || []);
      setSummary(sRes.data);
      setRealtime(rtRes.data);
      setByDevice(bdRes.data.by_device || bdRes.data.data || bdRes.data || []);
    } catch { toast.error('Error al cargar consumo'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddReading = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.consumption.addReading(form);
      toast.success('Lectura registrada');
      setShowForm(false);
      setForm({ device_id: '', instant_watts: '', accumulated_kwh_day: '', reading_timestamp: '', source: 'manual' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar lectura');
    }
    setSaving(false);
  };

  const columns = [
    { header: 'Fecha', key: 'reading_timestamp', render: (v) => new Date(v).toLocaleString('es-AR') },
    { header: 'Dispositivo', key: 'device', render: (_, r) => r.device?.name || r.device_id || 'N/A' },
    { header: 'Watts', key: 'instant_watts' },
    { header: 'kWh Acumulado', key: 'accumulated_kwh_day' },
    { header: 'Fuente', key: 'source' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2><Zap size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Consumo Energético</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>⚡ Agregar Lectura</button>
      </div>

      <div className="filter-bar">
        <input className="form-input" type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
        <input className="form-input" type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
        <button className="btn btn-secondary" onClick={load}>Filtrar</button>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 20 }}>
        {realtime && (
          <div className="stat-card stat-card-primary">
            <div className="stat-card-icon"><Activity size={24} /></div>
            <div className="stat-card-content">
              <h3 className="stat-card-value">{realtime.instant_watts || realtime.currentWatts || 0} W</h3>
              <p className="stat-card-label">Consumo Actual</p>
            </div>
          </div>
        )}
        {summary && (
          <>
            <StatCard icon={<Zap size={24} />} value={`${summary.daily || 0} kWh`} label="Promedio Diario" color="primary" />
            <StatCard icon={<Zap size={24} />} value={`${summary.weekly || 0} kWh`} label="Esta Semana" color="info" />
            <StatCard icon={<Zap size={24} />} value={`${summary.monthly || 0} kWh`} label="Este Mes" color="warning" />
          </>
        )}
      </div>

      {byDevice.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <BarChart data={byDevice} xKey="name" yKey="consumption" title="Consumo por Dispositivo" />
        </div>
      )}

      {loading ? <LoadingSpinner /> : <DataTable columns={columns} data={readings} emptyMessage="No hay lecturas registradas" />}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agregar Lectura</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleAddReading}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Dispositivo (opcional)</label>
                  <input className="form-input" value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })} placeholder="ID del dispositivo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Consumo Instantáneo (Watts)</label>
                  <input className="form-input" type="number" step="0.01" value={form.instant_watts} onChange={e => setForm({ ...form, instant_watts: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">kWh Acumulado del Día</label>
                  <input className="form-input" type="number" step="0.01" value={form.accumulated_kwh_day} onChange={e => setForm({ ...form, accumulated_kwh_day: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha y Hora</label>
                  <input className="form-input" type="datetime-local" value={form.reading_timestamp} onChange={e => setForm({ ...form, reading_timestamp: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fuente</label>
                  <select className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                    <option value="manual">Manual</option>
                    <option value="sensor">Sensor</option>
                    <option value="estimated">Estimado</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
