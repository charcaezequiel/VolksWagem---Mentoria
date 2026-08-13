import React, { useState, useEffect } from 'react';
import { User, Shield, Mail, MapPin, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PageSection from '../components/common/PageSection';
import Field from '../components/common/Field';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
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
      toast.success('Perfil actualizado correctamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');
    setSaving(true);
    try {
      await api.auth.updateProfile(passwords);
      toast.success('Contraseña cambiada');
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
          <h2><User size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Mi Perfil</h2>
          <p className="page-header-subtitle">Administrá tus datos personales, tu provincia y las preferencias de alertas.</p>
        </div>
      </div>

      <div className="profile-grid">
        <PageSection icon={<User size={18} />} title="Información personal" subtitle="Estos datos se usan para calcular tus tarifas y predicciones.">
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <Field label="Nombre completo" icon={<User size={15} />} required>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Tu nombre" />
              </Field>
            </div>
            <div className="form-group">
              <Field label="Email" icon={<Mail size={15} />} hint="No se puede modificar.">
                <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
              </Field>
            </div>
            <div className="form-group">
              <Field label="Provincia" icon={<MapPin size={15} />} hint="Se usa para aplicar las tarifas de tu distribuidor.">
                <select className="form-select" value={form.province_id} onChange={e => setForm({ ...form, province_id: e.target.value })}>
                  <option value="">Seleccionar provincia</option>
                  {provinces.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="form-group">
              <Field label="Umbral de alerta (kWh/mes)" icon={<BellRing size={15} />} hint="Recibirás alertas si superás este consumo mensual.">
                <input className="form-input" type="number" step="0.1" value={form.alert_threshold_kwh} onChange={e => setForm({ ...form, alert_threshold_kwh: e.target.value })} placeholder="Ej: 400" />
              </Field>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </form>
        </PageSection>

        <PageSection icon={<Shield size={18} />} title="Seguridad" subtitle="Cambiá tu contraseña de acceso.">
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <Field label="Contraseña actual" icon={<Shield size={15} />} required>
                <input className="form-input" type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required placeholder="••••••••" />
              </Field>
            </div>
            <div className="form-group">
              <Field label="Nueva contraseña" icon={<Shield size={15} />} required hint="Mínimo 6 caracteres.">
                <input className="form-input" type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} placeholder="••••••••" />
              </Field>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Cambiando...' : 'Cambiar contraseña'}</button>
          </form>
        </PageSection>
      </div>
    </div>
  );
}
