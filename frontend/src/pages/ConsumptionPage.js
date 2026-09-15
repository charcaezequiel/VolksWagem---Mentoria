import React, { useState, useEffect } from 'react';
import { Zap, Activity, Plus, Cpu, CalendarRange, Play, Square, Timer as TimerIcon, DollarSign, RefreshCw } from 'lucide-react';
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
  const [profile, setProfile] = useState(null);
  const [manualDevice, setManualDevice] = useState('');
  const [manualSubsidy, setManualSubsidy] = useState('N1');
  const [manualTimes, setManualTimes] = useState('1');
  const [timer, setTimer] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [session, setSession] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const [rRes, sRes, rtRes, bdRes, dRes, pRes] = await Promise.all([
        api.consumption.getReadings(params),
        api.consumption.getSummary(params),
        api.consumption.getRealtime().catch(() => ({ data: null })),
        api.consumption.getByDevice(params),
        api.devices.getAll(),
        api.auth.getProfile().catch(() => ({ data: { user: null } })),
      ]);
      setReadings(rRes.data.readings || rRes.data || []);
      setSummary(sRes.data);
      setRealtime(rtRes.data);
      setByDevice(bdRes.data.by_device || bdRes.data.data || bdRes.data || []);
      setDevices(dRes.data.devices || dRes.data || []);
      setProfile(pRes.data?.user || null);
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

  const fmtARS = (v) => (v == null ? t('consumption.manual_no_cost') : `$${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);

  const fmtElapsed = (sec) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
  };

  useEffect(() => {
    if (!timer) return undefined;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timer.startAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [timer]);

  const startTimer = () => {
    if (!manualDevice) return toast.error(t('consumption.manual_pick_device'));
    const dev = devices.find((d) => (d.id || d._id) === manualDevice);
    if (!dev) return;
    setSession(null);
    setElapsed(0);
    setTimer({ device_id: dev.id || dev._id, device_name: dev.name, watts: dev.nominal_watts, startAt: Date.now() });
    toast.success(t('consumption.manual_started'));
  };

  const resetTimer = () => {
    setTimer(null);
    setElapsed(0);
    setSession(null);
  };

  const stopTimer = async () => {
    if (!timer) return;
    const hours = elapsed / 3600;
    const kwh = (timer.watts * hours) / 1000;
    const times = parseInt(manualTimes, 10) || 1;
    const monthlyKwh = kwh * times * 30;
    setManualLoading(true);
    try {
      await api.consumption.addReading({
        device_id: timer.device_id,
        instant_watts: timer.watts,
        accumulated_kwh_day: Math.round(kwh * 1000) / 1000,
        source: 'manual',
      });
    } catch { /* the session result is still shown below */ }
    let monthlyCost = null;
    let category = null;
    if (profile?.province_id) {
      try {
        const res = await api.tariffs.estimate(profile.province_id, Math.round(monthlyKwh * 100) / 100, manualSubsidy);
        monthlyCost = res.data.result?.estimated_total ?? null;
        category = res.data.result?.category?.category || null;
      } catch { /* province may have no tariffs */ }
    }
    setSession({ hours, kwh, monthlyKwh, monthlyCost, category });
    setTimer(null);
    setElapsed(0);
    setManualLoading(false);
    toast.success(t('consumption.manual_saved'));
    load();
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

      <PageSection
        icon={<TimerIcon size={18} />}
        title={t('consumption.manual_title')}
        subtitle={t('consumption.manual_subtitle')}
        style={{ marginBottom: 24 }}
      >
        <div className="form-group">
          <Field label={t('consumption.manual_device')} icon={<Cpu size={15} />} hint={t('consumption.manual_device_hint')}>
            <select className="form-select" value={manualDevice} onChange={(e) => setManualDevice(e.target.value)} disabled={!!timer}>
              <option value="">{t('consumption.manual_select_device')}</option>
              {devices.map((d) => <option key={d.id || d._id} value={d.id || d._id}>{d.name} · {d.nominal_watts} W</option>)}
            </select>
          </Field>
          <Field label={t('consumption.manual_subsidy')} icon={<DollarSign size={15} />} hint={t('consumption.manual_subsidy_hint')}>
            <select className="form-select" value={manualSubsidy} onChange={(e) => setManualSubsidy(e.target.value)} disabled={!!timer}>
              <option value="N1">N1 — {t('tariffs.subsidy_n1')}</option>
              <option value="N2">N2 — {t('tariffs.subsidy_n2')}</option>
              <option value="N3">N3 — {t('tariffs.subsidy_n3')}</option>
            </select>
          </Field>
          <Field label={t('consumption.manual_times')} icon={<RefreshCw size={15} />} hint={t('consumption.manual_times_hint')}>
            <input className="form-input" type="number" min="1" step="1" value={manualTimes} onChange={(e) => setManualTimes(e.target.value)} disabled={!!timer} />
          </Field>
        </div>

        <div className="manual-timer">
          {timer ? (
            <>
              <div className="manual-timer-info">
                <strong>{timer.device_name}</strong>
                <span>{t('consumption.manual_running')}</span>
              </div>
              <div className="timer-display">{fmtElapsed(elapsed)}</div>
              <div className="timer-live">
                {t('consumption.manual_current_kwh')}: <strong>{((timer.watts * (elapsed / 3600)) / 1000).toFixed(3)} kWh</strong>
              </div>
              <div className="manual-timer-actions">
                <button className="btn btn-danger" onClick={stopTimer} disabled={manualLoading}>
                  <Square size={16} /> {manualLoading ? t('consumption.form_saving') : t('consumption.manual_stop')}
                </button>
                <button className="btn btn-secondary" onClick={resetTimer}><RefreshCw size={16} /> {t('consumption.manual_reset')}</button>
              </div>
            </>
          ) : session ? (
            <>
              <div className="calc-result" style={{ marginTop: 0 }}>
                <div className="calc-result-label">
                  {session.category ? <span className="calc-result-cat">{session.category}</span> : <span>{t('consumption.manual_session_kwh')}</span>}
                </div>
                <div className="calc-result-grid">
                  <span>{t('consumption.manual_elapsed')}</span><strong>{fmtElapsed(Math.round(session.hours * 3600))}</strong>
                  <span>{t('consumption.manual_session_kwh')}</span><strong>{session.kwh.toFixed(3)} kWh</strong>
                  <span>{t('consumption.manual_monthly_kwh')}</span><strong>{session.monthlyKwh.toFixed(2)} kWh</strong>
                  <span className="calc-total-label">{t('consumption.manual_monthly_cost')}</span>
                  <strong className="calc-total-value">{session.monthlyCost != null ? fmtARS(session.monthlyCost) : t('consumption.manual_no_cost')}</strong>
                </div>
                <div className="calc-result-hint">{session.monthlyCost != null ? t('consumption.manual_result_hint') : t('consumption.manual_no_province')}</div>
              </div>
              <button className="btn btn-primary" onClick={() => { setSession(null); setManualDevice(''); }}>
                <Play size={16} /> {t('consumption.manual_new_session')}
              </button>
            </>
          ) : (
            <>
              <p className="form-hint">{devices.length === 0 ? t('consumption.manual_no_devices') : t('consumption.manual_pick_device')}</p>
              <div className="manual-timer-actions">
                <button className="btn btn-primary" onClick={startTimer} disabled={!manualDevice || devices.length === 0}>
                  <Play size={16} /> {t('consumption.manual_start')}
                </button>
              </div>
            </>
          )}
        </div>
      </PageSection>

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
