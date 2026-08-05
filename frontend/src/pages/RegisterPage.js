import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', provinceId: '' });
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.tariffs.getProvinces().then(res => setProvinces(res.data.provinces || res.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.provinceId || undefined);
      toast.success('¡Cuenta creada!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>⚡ ControlAR</h1>
          <p>Creá tu cuenta</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" type="text" value={form.name} onChange={update('name')} required placeholder="Tu nombre" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={update('email')} required placeholder="tu@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input className="form-input" type="password" value={form.password} onChange={update('password')} required minLength={6} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="form-group">
            <label className="form-label">Provincia</label>
            <select className="form-select" value={form.provinceId} onChange={update('provinceId')}>
              <option value="">Seleccionar provincia</option>
              {provinces.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creando...' : 'Crear Cuenta'}
          </button>
        </form>
        <div className="auth-footer">
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </div>
      </div>
    </div>
  );
}
