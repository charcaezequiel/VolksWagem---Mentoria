import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Tag, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FieldHint from '../../components/admin/FieldHint';

const emptyCategory = { name: '', icon: '', description: '' };
const emptyAppliance = { category_id: '', name: '', nominal_watts: '', min_watts: '', max_watts: '', hours_daily_usage: '' };
const emptyDevice = { user_id: '', category_id: '', name: '', nominal_watts: '', hours_daily_usage: '' };

export default function AdminCatalogPage() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const [catForm, setCatForm] = useState(emptyCategory);
  const [showCatForm, setShowCatForm] = useState(false);

  const [appForm, setAppForm] = useState(emptyAppliance);
  const [showAppForm, setShowAppForm] = useState(false);

  const [devForm, setDevForm] = useState(emptyDevice);
  const [showDevForm, setShowDevForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Se piden las cuentas con limite alto porque el alta de dispositivo
      // necesita un select: en un despliegue real hay mas de 20 usuarios.
      const [cats, usrs] = await Promise.all([
        api.admin.getCategories(),
        api.admin.getUsers({ limit: 100, status: 'active' }),
      ]);
      setCategories(cats.data.categories || []);
      setUsers(usrs.data.users || []);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (key, fn, successMsg) => {
    setBusy(key);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      load();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
      return false;
    } finally {
      setBusy('');
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    const ok = await run('cat', () => api.admin.createCategory(catForm));
    if (ok) { setCatForm(emptyCategory); setShowCatForm(false); }
  };

  const addAppliance = async (e) => {
    e.preventDefault();
    const ok = await run('app', () => api.admin.createAppliance(appForm));
    if (ok) { setAppForm(emptyAppliance); setShowAppForm(false); }
  };

  const addDevice = async (e) => {
    e.preventDefault();
    const ok = await run('dev', () => api.admin.createDevice(devForm));
    if (ok) { setDevForm(emptyDevice); setShowDevForm(false); }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`${t('common.delete')}: ${category.name}?`)) return;
    await run(`cat-${category.id}`, () => api.admin.deleteCategory(category.id));
  };

  const removeAppliance = async (appliance) => {
    if (!window.confirm(`${t('common.delete')}: ${appliance.name}?`)) return;
    await run(`app-${appliance.id}`, () => api.admin.deleteAppliance(appliance.id));
  };

  /* El token del sensor es la credencial que usa el dispositivo fisico. Se
     muestra una sola vez al crearlo y el boton lo regenera. */
  const rotateToken = async (device) => {
    if (!window.confirm(`${t('admin.catalog.rotate_token')}: ${device.name}?`)) return;
    await run(`tok-${device.id}`, () => api.admin.rotateDeviceToken(device.id), t('admin.catalog.token_rotated'));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h2>{t('admin.tab.catalog')}</h2>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <h3><Tag size={17} /> {t('admin.catalog.categories')}</h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCatForm((v) => !v)}>
            <Plus size={15} /> {t('admin.catalog.new_category')}
          </button>
        </div>

        {showCatForm && (
          <form className="admin-form admin-form-inline" onSubmit={addCategory}>
            <label>
              <span>{t('admin.form.name')}</span>
              <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder={t('admin.catalog.name_ph')} required />
              <FieldHint hint={t('admin.catalog.name_help')} />
            </label>
            <label>
              <span>{t('admin.catalog.icon')}</span>
              <input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="🏠" />
              <FieldHint hint={t('admin.catalog.icon_help')} />
            </label>
            <label className="grow">
              <span>{t('admin.catalog.description')}</span>
              <input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} placeholder={t('admin.catalog.description_ph')} />
              <FieldHint hint={t('admin.catalog.description_help')} />
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy === 'cat'}>{t('common.save')}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCatForm(false)}>{t('common.cancel')}</button>
            </div>
          </form>
        )}

        <div className="admin-grid-3">
          {categories.map((c) => (
            <article key={c.id} className="admin-tile">
              <div className="admin-tile-head">
                <strong>{c.name}</strong>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeCategory(c)}
                  disabled={busy === `cat-${c.id}`}
                  title={t('common.delete')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {c.description && <p>{c.description}</p>}
              <span className="admin-tile-meta">
                {c.appliance_count} {t('admin.catalog.appliance_count')}
              </span>
            </article>
          ))}
          {!categories.length && <p className="admin-empty">{t('common.no_data')}</p>}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h3><Zap size={17} /> {t('admin.catalog.appliances')}</h3>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAppForm((v) => !v)}
            disabled={!categories.length}
          >
            <Plus size={15} /> {t('admin.catalog.new_appliance')}
          </button>
        </div>

        {showAppForm && (
          <form className="admin-form admin-form-inline" onSubmit={addAppliance}>
            <label>
              <span>{t('admin.catalog.category')}</span>
              <select value={appForm.category_id} onChange={(e) => setAppForm({ ...appForm, category_id: e.target.value })} required>
                <option value="">{t('admin.catalog.pick_category')}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <FieldHint hint={t('admin.catalog.category_help')} />
            </label>
            <label>
              <span>{t('admin.form.name')}</span>
              <input value={appForm.name} onChange={(e) => setAppForm({ ...appForm, name: e.target.value })} placeholder={t('admin.catalog.appliance_ph')} required />
              <FieldHint hint={t('admin.catalog.appliance_name_help')} />
            </label>
            <label>
              <span>{t('admin.catalog.watts')}</span>
              <input type="number" step="any" min="0" value={appForm.nominal_watts} onChange={(e) => setAppForm({ ...appForm, nominal_watts: e.target.value })} placeholder="1500" required />
              <FieldHint hint={t('admin.catalog.watts_help')} ejemplo={t('admin.catalog.watts_ej')} />
            </label>
            <label>
              <span>{t('admin.catalog.hours')}</span>
              <input type="number" step="any" min="0" max="24" value={appForm.hours_daily_usage} onChange={(e) => setAppForm({ ...appForm, hours_daily_usage: e.target.value })} placeholder="4" />
              <FieldHint hint={t('admin.catalog.hours_help')} />
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy === 'app'}>{t('common.save')}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAppForm(false)}>{t('common.cancel')}</button>
            </div>
          </form>
        )}

        <div className="admin-chips">
          {categories.map((c) => {
            const list = (c.appliances || []).filter(Boolean);
            if (!list.length) return null;
            return (
              <span key={c.id} className="admin-appliance-chip">
                <em>{c.name}</em>
                {list.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="admin-chip-btn"
                    onClick={() => removeAppliance(a)}
                    title={`${a.nominal_watts} W — ${t('common.delete')}`}
                  >
                    {a.name} · {a.nominal_watts}W
                    <Trash2 size={12} />
                  </button>
                ))}
              </span>
            );
          })}
          {!categories.length && <p className="admin-empty">{t('common.no_data')}</p>}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h3><RefreshCw size={17} /> {t('admin.catalog.new_device')}</h3>
        </div>

        <form className="admin-form admin-form-inline" onSubmit={addDevice}>
          <label>
            <span>{t('admin.catalog.user')}</span>
            <select value={devForm.user_id} onChange={(e) => setDevForm({ ...devForm, user_id: e.target.value })} required>
              <option value="">{t('admin.catalog.pick_user')}</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
            <FieldHint hint={t('admin.catalog.user_help')} />
          </label>
          <label>
            <span>{t('admin.catalog.category')}</span>
            <select value={devForm.category_id} onChange={(e) => setDevForm({ ...devForm, category_id: e.target.value })} required>
              <option value="">{t('admin.catalog.pick_category')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FieldHint hint={t('admin.catalog.device_category_help')} />
          </label>
          <label>
            <span>{t('admin.form.name')}</span>
            <input value={devForm.name} onChange={(e) => setDevForm({ ...devForm, name: e.target.value })} placeholder={t('admin.catalog.device_ph')} required />
            <FieldHint hint={t('admin.catalog.device_name_help')} />
          </label>
          <label>
            <span>{t('admin.catalog.watts')}</span>
            <input type="number" step="any" min="0" value={devForm.nominal_watts} onChange={(e) => setDevForm({ ...devForm, nominal_watts: e.target.value })} placeholder="100" required />
            <FieldHint hint={t('admin.catalog.device_watts_help')} />
          </label>
          <label>
            <span>{t('admin.catalog.hours')}</span>
            <input type="number" step="any" min="0" max="24" value={devForm.hours_daily_usage} onChange={(e) => setDevForm({ ...devForm, hours_daily_usage: e.target.value })} placeholder="24" />
            <FieldHint hint={t('admin.catalog.device_hours_help')} />
          </label>
          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy === 'dev'}>
              <Plus size={15} /> {t('common.save')}
            </button>
          </div>
        </form>

        {/* Antes estaba hardcodeado en espanol y con la palabra "IoT", que no le dice
            nada a un admin que no desarrollo. */}
          <p className="admin-hint">{t('admin.catalog.token_help')}</p>
      </section>
    </div>
  );
}
