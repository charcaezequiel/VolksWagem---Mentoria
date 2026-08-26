import React, { useState, useEffect } from 'react';
import { User, Shield, Mail, MapPin, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PageSection from '../components/common/PageSection';
import Field from '../components/common/Field';
import toast from 'react-hot-toast';
import { useTranslation } from '../context/LanguageContext';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', province_id: '', alert_threshold_kwh: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [provinces, setProvinces] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', province_id: user.province_id || user.province?.id || '', alert_threshold_kwh: user.alert_threshold_kwh || '' });
    api.tariffs.getProvinces().then(res => setProvinces(res.data.provinces || res.data || [])).catch(() => {});
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success(t('profile.save_success'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.error'));
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) return toast.error(t('profile.password_error_min'));
    setSaving(true);
    try {
      await api.auth.updateProfile(passwords);
      toast.success(t('profile.password_success'));
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña');
    }
    setSaving(false);
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <div className="page-header-text">
          <h2><User size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('profile.title')}</h2>
          <p className="page-header-subtitle">{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="profile-grid">
        <PageSection icon={<User size={18} />} title={t('profile.personal_title')} subtitle={t('profile.personal_subtitle')}>
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <Field label={t('profile.name')} icon={<User size={15} />} required>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder={t('profile.name_placeholder')} />
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('profile.email')} icon={<Mail size={15} />} hint={t('profile.email_hint')}>
                <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('profile.province')} icon={<MapPin size={15} />} hint={t('profile.province_hint')}>
                <select className="form-select" value={form.province_id} onChange={e => setForm({ ...form, province_id: e.target.value })}>
                  <option value="">{t('profile.province_placeholder')}</option>
                  {provinces.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('profile.threshold')} icon={<BellRing size={15} />} hint={t('profile.threshold_hint')}>
                <input className="form-input" type="number" step="0.1" value={form.alert_threshold_kwh} onChange={e => setForm({ ...form, alert_threshold_kwh: e.target.value })} placeholder={t('profile.threshold_placeholder')} />
              </Field>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('profile.saving') : t('profile.save')}</button>
          </form>
        </PageSection>

        <PageSection icon={<Shield size={18} />} title={t('profile.security_title')} subtitle={t('profile.security_subtitle')}>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <Field label={t('profile.current_password')} icon={<Shield size={15} />} required>
                <input className="form-input" type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required placeholder="••••••••" />
              </Field>
            </div>
            <div className="form-group">
              <Field label={t('profile.new_password')} icon={<Shield size={15} />} required hint={t('profile.new_password_hint')}>
                <input className="form-input" type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} placeholder="••••••••" />
              </Field>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('profile.changing') : t('profile.change_password')}</button>
          </form>
        </PageSection>
      </div>
    </div>
  );
}
