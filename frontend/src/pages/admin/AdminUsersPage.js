import React, { useState, useEffect, useCallback } from 'react';
import { Search, Shield, ShieldOff, UserPlus, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EMPTY_FORM = { name: '', email: '', password: '', province_id: '', user_type: 'residencial', role: 'user' };

const USER_TYPES = ['residencial', 'comercial', 'industrial', 'agropecuario'];

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getUsers({ search, role, status, page, limit: 20 });
      setUsers(res.data.users || []);
      setMeta({ total: res.data.total, page: res.data.page, pages: res.data.pages });
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [search, role, status, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.tariffs.getProvinces()
      .then((r) => setProvinces(r.data.provinces || r.data || []))
      .catch(() => setProvinces([]));
  }, []);

  const patchUser = async (id, patch, successMsg) => {
    setBusy(id);
    try {
      await api.admin.updateUser(id, patch);
      toast.success(t(successMsg));
      load();
    } catch (e) {
      // El backend ya devuelve el motivo exacto (por ejemplo, que no te
      // quites tu propio rol de admin), asi que se muestra tal cual.
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setBusy('');
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.email || !form.password) {
      setFormError(t('common.error'));
      return;
    }
    setBusy('create');
    try {
      await api.admin.createUser({
        ...form,
        province_id: form.province_id || null,
      });
      toast.success(t('admin.users.created'));
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e.response?.data?.error || e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h2>{t('admin.tab.users')}</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <UserPlus size={15} /> {t('admin.users.new')}
        </button>
      </div>

      {showForm && (
        <form className="admin-card admin-form" onSubmit={submitForm}>
          <div className="admin-form-grid">
            <label>
              <span>{t('admin.catalog.name')}</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label>
              <span>Password</span>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
            </label>
            <label>
              <span>{t('admin.tariffs.province')}</span>
              <select value={form.province_id} onChange={(e) => setForm({ ...form, province_id: e.target.value })}>
                <option value="">—</option>
                {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              <span>{t('admin.by_type')}</span>
              <select value={form.user_type} onChange={(e) => setForm({ ...form, user_type: e.target.value })}>
                {USER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>{t('admin.users.filter_role')}</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">{t('admin.role.user')}</option>
                <option value="admin">{t('admin.role.admin')}</option>
              </select>
            </label>
          </div>
          {formError && <p className="admin-form-error" role="alert">{formError}</p>}
          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy === 'create'}>
              {t('common.save')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="admin-filters">
        <div className="admin-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.users.search')}
          />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">{t('admin.users.filter_role')}: {t('admin.users.all')}</option>
          <option value="admin">{t('admin.role.admin')}</option>
          <option value="user">{t('admin.role.user')}</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t('admin.users.filter_status')}: {t('admin.users.all')}</option>
          <option value="active">{t('admin.users.activate')}</option>
          <option value="inactive">{t('admin.users.deactivate')}</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.catalog.name')}</th>
                <th>{t('admin.users.filter_role')}</th>
                <th>{t('admin.tariffs.province')}</th>
                <th>{t('admin.users.filter_status')}</th>
                <th style={{ textAlign: 'right' }}>{t('common.edit')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id} className={u.is_active ? '' : 'admin-row-inactive'}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-avatar">{u.name?.charAt(0) || '?'}</span>
                        <div>
                          <strong>{u.name}</strong>
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-chip admin-chip-${u.role}`}>
                        {u.role === 'admin' ? t('admin.role.admin') : t('admin.role.user')}
                      </span>
                    </td>
                    <td>{u.province?.name || '—'}</td>
                    <td>
                      <span className={`admin-chip admin-chip-${u.is_active ? 'ok' : 'off'}`}>
                        {u.is_active ? t('admin.users.activate') : t('admin.users.deactivate')}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      {!isSelf && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={busy === u.id}
                          onClick={() => patchUser(
                            u.id,
                            { role: u.role === 'admin' ? 'user' : 'admin' },
                            'admin.users.updated',
                          )}
                          title={u.role === 'admin' ? t('admin.users.demote') : t('admin.users.promote')}
                        >
                          {u.role === 'admin' ? <ShieldOff size={15} /> : <Shield size={15} />}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy === u.id}
                        onClick={() => patchUser(u.id, { is_active: !u.is_active }, 'admin.users.updated')}
                        title={u.is_active ? t('admin.users.deactivate') : t('admin.users.activate')}
                      >
                        <Power size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!users.length && (
                <tr><td colSpan={5} className="admin-empty">{t('common.no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {meta.pages > 1 && (
        <div className="admin-pager">
          <button type="button" className="btn btn-ghost btn-sm" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>
            <ChevronLeft size={15} />
          </button>
          <span>{meta.page} / {meta.pages} · {meta.total}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={meta.page >= meta.pages} onClick={() => setPage(meta.page + 1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
