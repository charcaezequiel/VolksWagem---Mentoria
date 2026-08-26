import React, { useState, useMemo } from 'react';
import {
  Snowflake, Refrigerator, Shirt, Monitor, Tv, Flame, Cpu,
  Lightbulb, Fan, Search, ChevronLeft, ChevronRight, Check, SlidersHorizontal,
} from 'lucide-react';
import Modal from '../common/Modal';
import Field from '../common/Field';
import { useTranslation } from '../../context/LanguageContext';

const categoryIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('aire') || n.includes('clima') || n.includes('calef') || n.includes('ventil')) return <Fan size={22} />;
  if (n.includes('helad') || n.includes('refrig') || n.includes('freezer') || n.includes('congel')) return <Refrigerator size={22} />;
  if (n.includes('lavarrop') || n.includes('lavad') || n.includes('secarrop')) return <Shirt size={22} />;
  if (n.includes('comput') || n.includes('pc') || n.includes('inform') || n.includes('monitor')) return <Monitor size={22} />;
  if (n.includes('telev') || n.includes('tv') || n.includes('entreten')) return <Tv size={22} />;
  if (n.includes('cocina') || n.includes('cocc')) return <Flame size={22} />;
  if (n.includes('ilumin')) return <Lightbulb size={22} />;
  return <Cpu size={22} />;
};

export default function DeviceFormModal({ categories, applianceGroups, initial, saving, onClose, onSave }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(initial ? 3 : 1);
  const [categoryId, setCategoryId] = useState(initial?.category_id || '');
  const [form, setForm] = useState({
    name: initial?.name || '',
    nominal_watts: initial?.nominal_watts || '',
    hours_daily_usage: initial?.hours_daily_usage || '',
  });
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState(false);

  const category = categories.find((c) => (c.id || c._id) === categoryId);
  const appliances = useMemo(() => {
    const group = applianceGroups.find((g) => (g.id || g._id) === categoryId);
    return group?.appliances || [];
  }, [applianceGroups, categoryId]);

  const filteredAppliances = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appliances;
    return appliances.filter((a) => (a.name || '').toLowerCase().includes(q));
  }, [appliances, search]);

  const selectCategory = (id) => {
    setCategoryId(id);
    setCustom(false);
    setSearch('');
    setStep(2);
  };

  const selectAppliance = (appliance) => {
    setForm({
      name: appliance.name,
      nominal_watts: appliance.nominal_watts,
      hours_daily_usage: appliance.hours_daily_usage,
    });
    setStep(3);
  };

  const goCustom = () => {
    setCustom(true);
    setStep(3);
  };

  const submit = (e) => {
    e.preventDefault();
    onSave({ ...form, category_id: categoryId });
  };

  return (
    <Modal
      title={initial ? t('device_form.title_edit') : t('device_form.title_new')}
      subtitle={initial ? t('device_form.subtitle_edit') : t('device_form.subtitle_new')}
      icon={initial ? <SlidersHorizontal size={18} /> : <Cpu size={18} />}
      onClose={onClose}
      size="lg"
    >
      {!initial && (
        <div className="wizard-steps">
          <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            <span className="wizard-step-num">{step > 1 ? <Check size={14} /> : 1}</span>
            <span className="wizard-step-label">{t('device_form.step_category')}</span>
          </div>
          <div className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
            <span className="wizard-step-num">{step > 2 ? <Check size={14} /> : 2}</span>
            <span className="wizard-step-label">{t('device_form.step_appliance')}</span>
          </div>
          <div className={`wizard-step ${step >= 3 ? 'active' : ''}`}>
            <span className="wizard-step-num">3</span>
            <span className="wizard-step-label">{t('device_form.step_confirm')}</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          <p className="wizard-intro">
            {t('device_form.intro')}
          </p>
          <div className="category-grid">
            {categories.map((c) => {
              const count = applianceGroups.find((g) => (g.id || g._id) === (c.id || c._id))?.appliances?.length || 0;
              return (
                <button key={c.id || c._id} className="category-card" onClick={() => selectCategory(c.id || c._id)}>
                  <span className="category-card-icon">{categoryIcon(c.name)}</span>
                  <span className="category-card-name">{c.name}</span>
                  <span className="category-card-count">{t('device_form.appliances_count', { count })}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="wizard-back-row">
            <button className="btn btn-sm btn-secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={14} /> {t('device_form.categories')}
            </button>
            <span className="wizard-category-name">{category?.name}</span>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              className="form-input"
              placeholder={t('device_form.search_placeholder', { category: category?.name })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="appliance-list">
            {filteredAppliances.length === 0 && (
              <p className="appliance-empty">{t('device_form.no_results')}</p>
            )}
            {filteredAppliances.map((a) => (
              <button key={a.id || a._id} className="appliance-card" onClick={() => selectAppliance(a)}>
                <span className="appliance-card-icon">{categoryIcon(a.name || category?.name)}</span>
                <span className="appliance-card-info">
                  <strong>{a.name}</strong>
                  <small>
                    {a.nominal_watts} W {a.hours_daily_usage ? `· ${a.hours_daily_usage} hs/día` : ''}
                  </small>
                </span>
                <ChevronRight size={18} className="appliance-card-arrow" />
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-block" onClick={goCustom}>
            <SlidersHorizontal size={16} /> {t('device_form.manual_config')}
          </button>
        </>
      )}

      {step === 3 && (
        <form onSubmit={submit}>
          {!initial && custom && (
            <div className="wizard-back-row">
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setStep(2); setSearch(''); }}>
                <ChevronLeft size={14} /> {t('device_form.back_catalog')}
              </button>
              {category && <span className="wizard-category-name">{category.name}</span>}
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <Field label={t('device_form.name_label')} icon={<Cpu size={15} />} required>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder={t('device_form.name_placeholder')} />
              </Field>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <Field label={t('device_form.watts_label')} icon={<Lightbulb size={15} />} required hint={t('device_form.watts_hint')}>
                <input className="form-input" type="number" min="0" step="1" value={form.nominal_watts} onChange={(e) => setForm({ ...form, nominal_watts: e.target.value })} required placeholder={t('device_form.watts_placeholder')} />
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('device_form.hours_label')} icon={<Monitor size={15} />} hint={t('device_form.hours_hint')}>
                <input className="form-input" type="number" min="0" step="0.5" value={form.hours_daily_usage} onChange={(e) => setForm({ ...form, hours_daily_usage: e.target.value })} placeholder={t('device_form.hours_placeholder')} />
              </Field>
            </div>
          </div>
          {!custom && !initial && category && (
            <div className="wizard-summary">
              <span className="wizard-summary-icon">{categoryIcon(category.name)}</span>
              <div>
                <strong>{form.name}</strong>
                <small>{category.name} · {form.nominal_watts} W{form.hours_daily_usage ? ` · ${form.hours_daily_usage} hs/día` : ''}</small>
              </div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setStep(2)}>
                {t('device_form.change')}
              </button>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('device_form.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Check size={16} /> {saving ? t('device_form.saving') : initial ? t('device_form.save') : t('device_form.register')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
