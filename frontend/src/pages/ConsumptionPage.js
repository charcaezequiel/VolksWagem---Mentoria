import React, { useState, useEffect, useRef } from 'react';
import { Zap, Activity, Plus, Cpu, CalendarRange, Play, Square, Timer as TimerIcon, DollarSign, RefreshCw, History, X } from 'lucide-react';
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
import { useManualTimer } from '../context/ManualTimerContext';

export default function ConsumptionPage() {
  const { t, lang } = useTranslation();
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
  const { timers, results, startTimer: startManual, stopTimer, resetTimer, removeResult, clearResults } = useManualTimer();
  const [now, setNow] = useState(() => Date.now());
  const stoppingRef = useRef(new Set());

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

  const fmtARS = (v) => (v == null ? t('consumption.manual_no_cost') : `$${Number(v).toLocaleString(lang === 'en' ? 'en-US' : 'es-AR', { maximumFractionDigits: 0 })}`);

  const fmtElapsed = (sec) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
  };

  // Ticker: refresca el "now" mientras haya cronómetros activos. El tiempo
  // transcurrido se calcula siempre desde `startAt`, por lo que los cronómetros
  // siguen contando aunque navegues a otra página y vuelvas.
  useEffect(() => {
    if (timers.length === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timers.length]);

  const startTimer = () => {
    if (!manualDevice) return toast.error(t('consumption.manual_pick_device'));
    const dev = devices.find((d) => (d.id || d._id) === manualDevice);
    if (!dev) return;
    startManual({
      device_id: dev.id || dev._id,
      device_name: dev.name,
      watts: dev.nominal_watts,
      subsidy: manualSubsidy,
      times: manualTimes,
      province_id: profile?.province_id || null,
    });
    toast.success(t('consumption.manual_started'));
  };

  const resetOneTimer = (id) => resetTimer(id);

  const stopOneTimer = async (id) => {
    if (stoppingRef.current.has(id)) return;
    stoppingRef.current.add(id);
    try {
      const res = await stopTimer(id);
      if (res) toast.success(t('consumption.manual_saved'));
    } finally {
      stoppingRef.current.delete(id);
    }
  };

  const columns = [
    { header: t('consumption.col_date'), key: 'reading_timestamp', render: (v) => (
      <span className="table-mono">{new Date(v).toLocaleString(lang === 'en' ? 'en-US' : 'es-AR')}</span>
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
            <select className="form-select" value={manualDevice} onChange={(e) => setManualDevice(e.target.value)}>
              <option value="">{t('consumption.manual_select_device')}</option>
              {devices.map((d) => <option key={d.id || d._id} value={d.id || d._id}>{d.name} · {d.nominal_watts} W</option>)}
            </select>
          </Field>
          <Field label={t('consumption.manual_subsidy')} icon={<DollarSign size={15} />} hint={t('consumption.manual_subsidy_hint')}>
            <select className="form-select" value={manualSubsidy} onChange={(e) => setManualSubsidy(e.target.value)}>
              <option value="N1">N1 — {t('tariffs.subsidy_n1')}</option>
              <option value="N2">N2 — {t('tariffs.subsidy_n2')}</option>
              <option value="N3">N3 — {t('tariffs.subsidy_n3')}</option>
            </select>
          </Field>
          <Field label={t('consumption.manual_times')} icon={<RefreshCw size={15} />} hint={t('consumption.manual_times_hint')}>
            <input className="form-input" type="number" min="1" step="1" value={manualTimes} onChange={(e) => setManualTimes(e.target.value)} />
          </Field>
        </div>

        <div className="manual-start-row">
          <p className="form-hint">{devices.length === 0 ? t('consumption.manual_no_devices') : t('consumption.manual_multi_hint')}</p>
          <button className="btn btn-primary" onClick={startTimer} disabled={!manualDevice || devices.length === 0}>
            <Play size={16} /> {t('consumption.manual_start')}
          </button>
        </div>

        {timers.length > 0 && (
          <div className="manual-timer-list">
            {timers.map((tm) => {
              const secs = Math.max(0, Math.floor((now - tm.startAt) / 1000));
              const liveKwh = (tm.watts * (secs / 3600)) / 1000;
              const stopping = stoppingRef.current.has(tm.id);
              return (
                <div key={tm.id} className="manual-timer-card">
                  <div className="manual-timer-card-top">
                    <span className="manual-timer-status"><span className="pulse-dot" />{t('consumption.manual_running')}</span>
                    <span className="appliance-card-watts"><strong>{tm.watts} W</strong><small>{t('device_form.power_label')}</small></span>
                  </div>
                  <strong className="manual-timer-name">{tm.device_name}</strong>
                  <div className="manual-timer-meta">
                    <span>{t('consumption.manual_subsidy')}: <b>{tm.subsidy}</b></span>
                    <span>·</span>
                    <span>{tm.times} {t('consumption.manual_per_day_short')}</span>
                  </div>
                  <div className="timer-display">{fmtElapsed(secs)}</div>
                  <div className="timer-live">
                    {t('consumption.manual_current_kwh')}: <strong>{liveKwh.toFixed(3)} kWh</strong>
                  </div>
                  <div className="manual-timer-actions">
                    <button className="btn btn-danger" onClick={() => stopOneTimer(tm.id)} disabled={stopping}>
                      <Square size={16} /> {stopping ? t('consumption.form_saving') : t('consumption.manual_stop')}
                    </button>
                    <button className="btn btn-secondary" onClick={() => resetOneTimer(tm.id)}>
                      <RefreshCw size={16} /> {t('consumption.manual_reset')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="manual-results">
          <div className="manual-results-head">
            <span className="manual-results-title">
              <History size={16} /> {t('consumption.manual_results_title')}
              {results.length > 0 && <span className="badge badge-secondary">{results.length}</span>}
            </span>
            {results.length > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={clearResults}>{t('consumption.manual_clear_all')}</button>
            )}
          </div>
          {results.length === 0 ? (
            <p className="form-hint">{t('consumption.manual_results_empty')}</p>
          ) : (
            results.map((r) => (
              <div key={r.id} className="manual-result-card">
                <div className="manual-result-card-head">
                  <strong>{r.device_name}</strong>
                  <div className="manual-result-card-meta">
                    {r.category && <span className="calc-result-cat">{r.category}</span>}
                    <button className="btn btn-sm btn-ghost" onClick={() => removeResult(r.id)} title={t('consumption.manual_dismiss')}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="calc-result" style={{ marginTop: 10 }}>
                  <div className="calc-result-label">
                    {r.category ? <span className="calc-result-cat">{r.category}</span> : <span>{t('consumption.manual_session_kwh')}</span>}
                  </div>
                  <div className="calc-result-grid">
                    <span>{t('consumption.manual_elapsed')}</span><strong>{fmtElapsed(r.elapsed)}</strong>
                    <span>{t('consumption.manual_session_kwh')}</span><strong>{r.kwh.toFixed(3)} kWh</strong>
                    <span>{t('consumption.manual_monthly_kwh')}</span><strong>{r.monthlyKwh.toFixed(2)} kWh</strong>
                    <span className="calc-total-label">{t('consumption.manual_monthly_cost')}</span>
                    <strong className="calc-total-value">{r.monthlyCost != null ? fmtARS(r.monthlyCost) : t('consumption.manual_no_cost')}</strong>
                  </div>
                  <div className="calc-result-hint">
                    {r.monthlyCost != null ? t('consumption.manual_result_hint') : t('consumption.manual_no_province')}
                    {!r.recorded && <span> · {t('consumption.manual_record_failed')}</span>}
                  </div>
                </div>
              </div>
            ))
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
                <input className="form-input" type="number" step="0.01" min="0" value={form.instant_watts} onChange={(e) => setForm({ ...form, instant_watts: e.target.value })} required placeholder={t('consumption.form_watts_placeholder')} />
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('consumption.form_field_kwh')} icon={<Activity size={15} />} hint={t('consumption.form_field_kwh_hint')}>
                <input className="form-input" type="number" step="0.01" min="0" value={form.accumulated_kwh_day} onChange={(e) => setForm({ ...form, accumulated_kwh_day: e.target.value })} placeholder={t('consumption.form_kwh_placeholder')} />
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
