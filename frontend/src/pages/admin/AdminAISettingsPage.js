import React, { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Brain, Sparkles, Receipt, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FieldHint from '../../components/admin/FieldHint';

/* Cada campo declara su tipo para que el render y el payload sean automaticos.
   Asi agregar un parametro nuevo es agregar una linea, no un input + un
   handler + una conversion manual. */
/* Cada campo declara ademas `help`, `ejemplo` y `avanzado` porque esta pantalla
   es la mas tecnica del panel y sin eso es inmanejable: "anomaly_sigma" no
   dice nada por si solo, y cambiarlo mal rompe las detecciones de anomalias
   para todos los clientes. Los marcados como avanzados se pueden dejar como
   estaban: casi siempre el valor por defecto ya sirve.

   El nombre de la clave (`key`) NO se renombra: es el contrato con la base y
   con el backend. Lo que se humaniza es la etiqueta y la ayuda. */
const AVANZADO = 'admin.ai.avanzado';
const FIELDS = {
  prediction: [
    {
      key: 'history_window_days', label: 'admin.ai.history_window', type: 'int',
      help: 'admin.ai.history_window_help', ejemplo: 'admin.ai.history_window_ej',
    },
    {
      key: 'bill_forecast_window_days', label: 'admin.ai.bill_window', type: 'int',
      help: 'admin.ai.bill_window_help', ejemplo: 'admin.ai.bill_window_ej',
    },
    {
      key: 'weekend_factor', label: 'admin.ai.weekend_factor', type: 'float', step: '0.01',
      help: 'admin.ai.weekend_factor_help', ejemplo: 'admin.ai.weekend_factor_ej',
    },
    {
      key: 'bill_weekend_factor', label: 'admin.ai.bill_weekend_factor', type: 'float', step: '0.01',
      help: 'admin.ai.bill_weekend_factor_help', avanzado: AVANZADO,
    },
    {
      key: 'min_confidence', label: 'admin.ai.min_confidence', type: 'float', step: '0.01',
      help: 'admin.ai.min_confidence_help', ejemplo: 'admin.ai.min_confidence_ej',
    },
    {
      key: 'max_confidence', label: 'admin.ai.max_confidence', type: 'float', step: '0.01',
      help: 'admin.ai.max_confidence_help', avanzado: AVANZADO,
    },
    {
      key: 'anomaly_sigma', label: 'admin.ai.anomaly_sigma', type: 'float', step: '0.1',
      help: 'admin.ai.anomaly_sigma_help', ejemplo: 'admin.ai.anomaly_sigma_ej', avanzado: AVANZADO,
    },
    {
      key: 'min_days_for_anomalies', label: 'admin.ai.min_days_anomalies', type: 'int',
      help: 'admin.ai.min_days_anomalies_help', avanzado: AVANZADO,
    },
    {
      key: 'model_version', label: 'admin.ai.model_version', type: 'text',
      help: 'admin.ai.model_version_help', avanzado: AVANZADO,
    },
  ],
  llm: [
    {
      key: 'gemini_model', label: 'admin.ai.gemini_model', type: 'text',
      help: 'admin.ai.gemini_model_help', avanzado: AVANZADO,
    },
    {
      key: 'temperature', label: 'admin.ai.temperature', type: 'float', step: '0.05',
      help: 'admin.ai.temperature_help', ejemplo: 'admin.ai.temperature_ej',
    },
    {
      key: 'top_p', label: 'admin.ai.top_p', type: 'float', step: '0.01',
      help: 'admin.ai.top_p_help', avanzado: AVANZADO,
    },
    {
      key: 'max_output_tokens', label: 'admin.ai.max_tokens', type: 'int',
      help: 'admin.ai.max_tokens_help', avanzado: AVANZADO,
    },
    {
      key: 'chat_history_turns', label: 'admin.ai.chat_turns', type: 'int',
      help: 'admin.ai.chat_turns_help', avanzado: AVANZADO,
    },
  ],
  billing: [
    {
      key: 'tax_factor', label: 'admin.ai.tax_factor', type: 'float', step: '0.01',
      help: 'admin.ai.tax_factor_help', ejemplo: 'admin.ai.tax_factor_ej',
    },
    {
      key: 'fallback_price_per_kwh', label: 'admin.ai.fallback_price', type: 'float', step: '0.001',
      help: 'admin.ai.fallback_price_help', ejemplo: 'admin.ai.fallback_price_ej',
    },
  ],
};

/* Cada seccion lleva `help`: dice el efecto real de tocarlo, para que el admin
   sepa si lo que esta a punto de cambiar le afecta a el o a todos los
   clientes. */
const SECTIONS = [
  { key: 'prediction', label: 'admin.ai.prediction', icon: Brain, help: 'admin.ai.prediction_help' },
  { key: 'llm', label: 'admin.ai.llm', icon: Sparkles, help: 'admin.ai.llm_help' },
  { key: 'billing', label: 'admin.ai.billing', icon: Receipt, help: 'admin.ai.billing_help' },
];

const MONTH_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
/* El nombre del mes sale de las traducciones y no de una lista fija en
   espanol: antes el calendario quedaba en espanol aunque el panel estuviera
   en ingles. */
const MONTH_KEYS_I18N = ['jan', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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
    /* Se recorre FIELDS, no SECTIONS. SECTIONS no tiene propiedad `fields`
       (los campos viven en FIELDS, indexados por la clave de la seccion), asi
       que el for anterior no iteraba nada y el payload salia vacio: se
       guardaban solo los factores estacionales y la escalera de confianza.
       Todos los campos declarados se castean segun su `type`. */
    for (const { key } of SECTIONS) {
      for (const f of FIELDS[key]) {
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
        {SECTIONS.map(({ key, label, icon: Icon, help }) => (
          <section key={key} className="admin-card">
            <div className="admin-card-head">
              <h3><Icon size={17} /> {t(label)}</h3>
            </div>
            <p className="admin-hint">{t(help)}</p>
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
                  <FieldHint
                    hint={f.help ? t(f.help) : ''}
                    ejemplo={f.ejemplo ? t(f.ejemplo) : ''}
                    avanzado={f.avanzado ? t(f.avanzado) : ''}
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
          {/* "1,00 = normal" es lo que hace entendible la grilla: sin esa
              referencia un 0,9 parece un error. */}
          <p className="admin-hint">{t('admin.ai.seasonal_help')}</p>
          <div className="admin-seasonal">
            {MONTH_KEYS.map((m, i) => (
              <label key={m} className="admin-seasonal-month">
                <span>{t(`admin.month.${MONTH_KEYS_I18N[i]}`)}</span>
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
          {/* Los dos inputs de la escalera no tenian etiqueta visible, solo un
              aria-label: el admin ve "30 → 0,6" sin saber cual era el numero
              de dias y cual la confianza. */}
          <p className="admin-hint">{t('admin.ai.confidence_ladder_help')}</p>
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
                  aria-label={t('admin.ai.ladder_days')}
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
                  aria-label={t('admin.ai.ladder_conf')}
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
