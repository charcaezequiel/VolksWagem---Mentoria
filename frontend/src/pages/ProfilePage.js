import React, { useState, useEffect } from 'react';
import { User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
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
      toast.success('Perfil actualizado');
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
    <div>
      <div className="page-header">
        <h2><User size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Mi Perfil</h2>
      </div>

      <div className="profile-card">
        <div className="card profile-section">
          <h3>Información Personal</h3>
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Provincia</label>
              <select className="form-select" value={form.province_id} onChange={e => setForm({ ...form, province_id: e.target.value })}>
                <option value="">Seleccionar provincia</option>
                {provinces.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Umbral de Alerta (kWh/mes)</label>
              <input className="form-input" type="number" step="0.1" value={form.alert_threshold_kwh} onChange={e => setForm({ ...form, alert_threshold_kwh: e.target.value })} placeholder="Ej: 400" />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Recibirás alertas si superás este consumo mensual</small>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
          </form>
        </div>

        <div className="card profile-section">
          <h3><Shield size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Cambiar Contraseña</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label">Contraseña Actual</label>
              <input className="form-input" type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nueva Contraseña</label>
              <input className="form-input" type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Cambiando...' : 'Cambiar Contraseña'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
