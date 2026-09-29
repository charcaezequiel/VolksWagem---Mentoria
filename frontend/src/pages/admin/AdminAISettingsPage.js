import React, { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Brain, Sparkles, Receipt, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/* Cada campo declara su tipo para que el render y el payload sean automaticos.
   Asi agregar un parametro nuevo es agregar una linea, no un input + un
   handler + una conversion manual. */
const FIELDS = {
  prediction: [
    { key: 'model_version', label: 'admin.ai.model_version', type: 'text' },
    { key: 'history_window_days', label: 'admin.ai.history_window', type: 'int' },
    { key: 'bill_forecast_window_days', label: 'admin.ai.bill_window', type: 'int' },
    { key: 'weekend_factor', label: 'admin.ai.weekend_factor', type: 'float', step: '0.01' },
    { key: 'bill_weekend_factor', label: 'admin.ai.bill_weekend_factor', type: 'float', step: '0.01' },
    { key: 'anomaly_sigma', label: 'admin.ai.anomaly_sigma', type: 'float', step: '0.1' },
    { key: 'min_days_for_anomalies', label: 'admin.ai.min_days_anomalies', type: 'int' },
    { key: 'min_confidence', label: 'admin.ai.min_confidence', type: 'float', step: '0.01' },
    { key: 'max_confidence', label: 'admin.ai.max_confidence', type: 'float', step: '0.01' },
  ],
  llm: [
    { key: 'gemini_model', label: 'admin.ai.gemini_model', type: 'text' },
    { key: 'temperature', label: 'admin.ai.temperature', type: 'float', step: '0.05' },
    { key: 'top_p', label: 'admin.ai.top_p', type: 'float', step: '0.01' },
    { key: 'max_output_tokens', label: 'admin.ai.max_tokens', type: 'int' },
    { key: 'chat_history_turns', label: 'admin.ai.chat_turns', type: 'int' },
  ],
  billing: [
    { key: 'tax_factor', label: 'admin.ai.tax_factor', type: 'float', step: '0.01' },
    { key: 'fallback_price_per_kwh', label: 'admin.ai.fallback_price', type: 'float', step: '0.001' },
  ],
};

const SECTIONS = [
  { key: 'prediction', label: 'admin.ai.prediction', icon: Brain },
  { key: 'llm', label: 'admin.ai.llm', icon: Sparkles },
  { key: 'billing', label: 'admin.ai.billing', icon: Receipt },
];

const MONTH_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AdminAISettingsPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getAiConfig();
      setForm(res.data.config || {});
      setUpdatedAt(res.data.config?.updated_at || null);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  /* Los campos numericos se guardan como string mientras se editan y se
     castean al enviar: castear en cada tecla dejaria el input saltando cuando
     el usuario borra el contenido para reescribir. */
  const buildPayload = () => {
    const payload = {};
    for (const { fields } of SECTIONS) {
      for (const f of fields) {
        const raw = form[f.key];
        if (raw === '' || raw === null || raw === undefined) continue;
        payload[f.key] = f.type === 'text' ? String(raw) : Number(raw);
      }
    }
    const seasonal = {};
    let seasonalOk = true;
    for (const m of MONTH_KEYS) {
      const v = Number(form.seasonal_factors?.[m]);
      if (!Number.isFinite(v) || v <= 0) { seasonalOk = false; break; }
      seasonal[m] = v;
    }
    if (seasonalOk) payload.seasonal_factors = seasonal;

    const ladder = (form.confidence_thresholds || [])
      .map(([d, c]) => [Number(d), Number(c)])
      .filter(([d, c]) => Number.isFinite(d) && Number.isFinite(c));
    if (ladder.length) payload.confidence_thresholds = ladder;

    return payload;
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.admin.updateAiConfig(buildPayload());
      setForm(res.data.config || {});
      toast.success(t('admin.ai.saved'));
      load();
    } catch (e) {
      const details = e.response?.data?.details;
      if (Array.isArray(details)) details.forEach((d) => toast.error(d));
      else toast.error(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(t('admin.ai.reset_confirm'))) return;
    try {
      const res = await api.admin.resetAiConfig();
      setForm(res.data.config || {});
      toast.success(t('admin.ai.saved'));
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
  };

  if (loading || !form) return <LoadingSpinner />;

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h2>{t('admin.tab.ai')}</h2>
        <div className="admin-head-actions">
          {updatedAt && (
            <span className="admin-hint">
              {t('admin.ai.last_updated')}: {new Date(updatedAt).toLocaleString()}
            </span>
          )}
          <button type="button" className="btn btn-ghost" onClick={reset}>
            <RotateCcw size={15} /> {t('admin.ai.reset')}
          </button>
        </div>
      </div>

      <p className="admin-hint">{t('admin.ai.hint')}</p>

      <form onSubmit={save}>
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <section key={key} className="admin-card">
            <div className="admin-card-head">
              <h3><Icon size={17} /> {t(label)}</h3>
            </div>
            <div className="admin-form-grid">
              {FIELDS[key].map((f) => (
                <label key={f.key}>
                  <span>{t(f.label)}</span>
                  <input
                    type={f.type === 'text' ? 'text' : 'number'}
                    step={f.step}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="admin-card">
          <div className="admin-card-head">
            <h3>{t('admin.ai.seasonal')}</h3>
          </div>
          <div className="admin-seasonal">
            {MONTH_KEYS.map((m, i) => (
              <label key={m} className="admin-seasonal-month">
                <span>{MONTH_NAMES[i]}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={form.seasonal_factors?.[m] ?? ''}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    seasonal_factors: { ...(prev.seasonal_factors || {}), [m]: e.target.value },
                  }))}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h3>{t('admin.ai.confidence_ladder')}</h3>
          </div>
          <p className="admin-hint">
            {t('admin.ai.days')} → {t('admin.ai.confidence')}
          </p>
          <div className="admin-ladder">
            {(form.confidence_thresholds || []).map(([days, conf], i) => (
              <div key={i} className="admin-ladder-row">
                <input
                  type="number"
                  min="0"
                  value={days}
                  onChange={(e) => {
                    const next = [...form.confidence_thresholds];
                    next[i] = [e.target.value, conf];
                    setField('confidence_thresholds', next);
                  }}
                  aria-label={t('admin.ai.days')}
                />
                <span>→</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={conf}
                  onChange={(e) => {
                    const next = [...form.confidence_thresholds];
                    next[i] = [days, e.target.value];
                    setField('confidence_thresholds', next);
                  }}
                  aria-label={t('admin.ai.confidence')}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setField(
                    'confidence_thresholds',
                    form.confidence_thresholds.filter((_, idx) => idx !== i),
                  )}
                  aria-label={t('common.delete')}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setField('confidence_thresholds', [...(form.confidence_thresholds || []), [0, 0.3]])}
            >
              <Plus size={14} />
            </button>
          </div>
        </section>

        <div className="admin-form-actions admin-sticky-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={15} /> {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
