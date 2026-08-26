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
import { useTranslation } from '../context/LanguageContext';

export default function ConsumptionPage() {
  const { t } = useTranslation();
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
    } catch { toast.error(t('consumption.error')); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddReading = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.consumption.addReading(form);
      toast.success(t('consumption.form_success'));
      setShowForm(false);
      setForm({ device_id: '', instant_watts: '', accumulated_kwh_day: '', reading_timestamp: '', source: 'manual' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || t('consumption.form_error'));
    }
    setSaving(false);
  };

  const columns = [
    { header: t('consumption.col_date'), key: 'reading_timestamp', render: (v) => (
      <span className="table-mono">{new Date(v).toLocaleString('es-AR')}</span>
    ) },
    { header: t('consumption.col_device'), key: 'device', render: (_, r) => r.device?.name || (r.device_id ? <code className="table-code">{r.device_id}</code> : '—') },
    { header: t('consumption.col_watts'), key: 'instant_watts', render: (v) => <span className="table-mono"><strong>{v ?? '—'}</strong> W</span> },
    { header: t('consumption.col_kwh'), key: 'accumulated_kwh_day', render: (v) => <span className="table-mono">{v ?? '—'}</span> },
    { header: t('consumption.col_source'), key: 'source', render: (v) => v === 'sensor' ? <span className="badge badge-success">{t('consumption.source_sensor')}</span> : v === 'estimated' ? <span className="badge badge-warning">{t('consumption.source_estimated')}</span> : <span className="badge badge-info">{t('consumption.source_manual')}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><Zap size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('consumption.title')}</h2>
          <p className="page-header-subtitle">{t('consumption.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> {t('consumption.add')}
        </button>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {realtime ? (
          <div className="stat-card stat-card-primary">
            <div className="stat-card-icon"><Activity size={22} /></div>
            <div className="stat-card-content">
              <h3 className="stat-card-value">{realtime.instant_watts || realtime.currentWatts || 0} W</h3>
              <p className="stat-card-label">{t('consumption.current')}</p>
            </div>
          </div>
        ) : (
          <StatCard icon={<Activity size={22} />} value="—" label={t('consumption.current')} color="primary" />
        )}
        {summary && (
          <>
            <StatCard icon={<Zap size={22} />} value={`${summary.daily || 0} kWh`} label={t('consumption.daily_avg')} color="primary" />
            <StatCard icon={<Zap size={22} />} value={`${summary.weekly || 0} kWh`} label={t('consumption.weekly')} color="info" />
            <StatCard icon={<Zap size={22} />} value={`${summary.monthly || 0} kWh`} label={t('consumption.monthly')} color="warning" />
          </>
        )}
      </div>

      {byDevice.length > 0 && (
        <PageSection
          icon={<Cpu size={18} />}
          title={t('consumption.by_device_title')}
          subtitle={t('consumption.by_device_subtitle')}
          style={{ marginBottom: 24 }}
        >
          <BarChart data={byDevice} xKey="name" yKey="consumption" title="" />
        </PageSection>
      )}

      <PageSection
        icon={<CalendarRange size={18} />}
        title={t('consumption.history_title')}
        subtitle={t('consumption.history_subtitle')}
        actions={
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <input className="form-input form-input-sm" type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
            <input className="form-input form-input-sm" type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
            <button className="btn btn-sm btn-secondary" onClick={load}>{t('consumption.filter')}</button>
          </div>
        }
      >
        {loading ? <LoadingSpinner /> : <DataTable columns={columns} data={readings} emptyMessage={t('consumption.empty')} />}
      </PageSection>

      {showForm && (
        <Modal
          title={t('consumption.form_title')}
          subtitle={t('consumption.form_subtitle')}
          icon={<Zap size={18} />}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleAddReading}>
            <div className="form-group">
              <Field label={t('consumption.form_field_device')} icon={<Cpu size={15} />} hint={t('consumption.form_field_device_hint')}>
                <select className="form-select" value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })}>
                  <option value="">{t('consumption.general_device')}</option>
                  {devices.map((d) => <option key={d.id || d._id} value={d.id || d._id}>{d.name} · {d.nominal_watts} W</option>)}
                </select>
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('consumption.form_field_watts')} icon={<Zap size={15} />} required hint={t('consumption.form_field_watts_hint')}>
                <input className="form-input" type="number" step="0.01" min="0" value={form.instant_watts} onChange={(e) => setForm({ ...form, instant_watts: e.target.value })} required placeholder="Ej.: 1500" />
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('consumption.form_field_kwh')} icon={<Activity size={15} />} hint={t('consumption.form_field_kwh_hint')}>
                <input className="form-input" type="number" step="0.01" min="0" value={form.accumulated_kwh_day} onChange={(e) => setForm({ ...form, accumulated_kwh_day: e.target.value })} placeholder="Ej.: 4.5" />
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('consumption.form_field_date')} icon={<CalendarRange size={15} />} hint={t('consumption.form_field_date_hint')}>
                <input className="form-input" type="datetime-local" value={form.reading_timestamp} onChange={(e) => setForm({ ...form, reading_timestamp: e.target.value })} />
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('consumption.form_field_source')} icon={<Activity size={15} />}>
                <select className="form-select" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="manual">{t('consumption.source_manual')}</option>
                  <option value="sensor">{t('consumption.source_sensor')}</option>
                  <option value="estimated">{t('consumption.source_estimated')}</option>
                </select>
              </Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('consumption.form_cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('consumption.form_saving') : t('consumption.form_submit')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
