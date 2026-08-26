import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, MapPin, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', provinceId: '' });
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    api.tariffs.getProvinces().then(res => setProvinces(res.data.provinces || res.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.provinceId || undefined);
      toast.success(t('register.success'));
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
          <div className="auth-logo-icon"><Zap size={32} /></div>
          <h1>{t('register.title')}</h1>
          <p>{t('register.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('register.name')}</label>
            <div className="input-with-icon">
              <User size={16} />
              <input className="form-input" type="text" value={form.name} onChange={update('name')} required placeholder={t('register.name_placeholder')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('register.email')}</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input className="form-input" type="email" value={form.email} onChange={update('email')} required placeholder="tu@email.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('register.password')}</label>
            <div className="input-with-icon">
              <Lock size={16} />
              <input className="form-input" type="password" value={form.password} onChange={update('password')} required minLength={6} placeholder={t('register.password_placeholder')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('register.province')}</label>
            <div className="input-with-icon">
              <MapPin size={16} />
              <select className="form-select" value={form.provinceId} onChange={update('provinceId')}>
                <option value="">{t('register.province_placeholder')}</option>
                {provinces.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <div className="auth-footer">
          {t('register.has_account')} <Link to="/login">{t('register.login_link')}</Link>
        </div>
      </div>
    </div>
  );
}
