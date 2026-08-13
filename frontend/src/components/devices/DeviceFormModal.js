import React, { useState, useMemo } from 'react';
import {
  Snowflake, Refrigerator, Shirt, Monitor, Tv, Flame, Cpu,
  Lightbulb, Fan, Search, ChevronLeft, ChevronRight, Check, SlidersHorizontal,
} from 'lucide-react';
import Modal from '../common/Modal';
import Field from '../common/Field';

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
      title={initial ? 'Editar dispositivo' : 'Registrar electrodoméstico'}
      subtitle={initial ? 'Actualizá los datos del dispositivo' : 'Elegí tu electrodoméstico en 3 pasos'}
      icon={initial ? <SlidersHorizontal size={18} /> : <Cpu size={18} />}
      onClose={onClose}
      size="lg"
    >
      {!initial && (
        <div className="wizard-steps">
          <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            <span className="wizard-step-num">{step > 1 ? <Check size={14} /> : 1}</span>
            <span className="wizard-step-label">Categoría</span>
          </div>
          <div className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
            <span className="wizard-step-num">{step > 2 ? <Check size={14} /> : 2}</span>
            <span className="wizard-step-label">Electrodoméstico</span>
          </div>
          <div className={`wizard-step ${step >= 3 ? 'active' : ''}`}>
            <span className="wizard-step-num">3</span>
            <span className="wizard-step-label">Confirmar</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          <p className="wizard-intro">
            ¿Qué tipo de electrodoméstico querés registrar? Elegí la categoría para ver las opciones del catálogo.
          </p>
          <div className="category-grid">
            {categories.map((c) => {
              const count = applianceGroups.find((g) => (g.id || g._id) === (c.id || c._id))?.appliances?.length || 0;
              return (
                <button key={c.id || c._id} className="category-card" onClick={() => selectCategory(c.id || c._id)}>
                  <span className="category-card-icon">{categoryIcon(c.name)}</span>
                  <span className="category-card-name">{c.name}</span>
                  <span className="category-card-count">{count} electrodomésticos</span>
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
              <ChevronLeft size={14} /> Categorías
            </button>
            <span className="wizard-category-name">{category?.name}</span>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              className="form-input"
              placeholder={`Buscar en ${category?.name}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="appliance-list">
            {filteredAppliances.length === 0 && (
              <p className="appliance-empty">No se encontraron electrodomésticos con ese nombre.</p>
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
            <SlidersHorizontal size={16} /> Configurar manualmente
          </button>
        </>
      )}

      {step === 3 && (
        <form onSubmit={submit}>
          {!initial && custom && (
            <div className="wizard-back-row">
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setStep(2); setSearch(''); }}>
                <ChevronLeft size={14} /> Volver al catálogo
              </button>
              {category && <span className="wizard-category-name">{category.name}</span>}
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <Field label="Nombre del dispositivo" icon={<Cpu size={15} />} required>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ej.: Heladera Samsung" />
              </Field>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <Field label="Potencia (Watts)" icon={<Lightbulb size={15} />} required hint="Figura en la etiqueta de eficiencia del equipo">
                <input className="form-input" type="number" min="0" step="1" value={form.nominal_watts} onChange={(e) => setForm({ ...form, nominal_watts: e.target.value })} required placeholder="Ej.: 120" />
              </Field>
            </div>
            <div className="form-group">
              <Field label="Horas de uso por día" icon={<Monitor size={15} />} hint="Estimación diaria de uso">
                <input className="form-input" type="number" min="0" step="0.5" value={form.hours_daily_usage} onChange={(e) => setForm({ ...form, hours_daily_usage: e.target.value })} placeholder="Ej.: 4" />
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
                Cambiar
              </button>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Check size={16} /> {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Registrar dispositivo'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
