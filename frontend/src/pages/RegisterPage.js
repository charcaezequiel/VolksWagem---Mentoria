import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, MapPin, Zap, Check, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', provinceId: '' });
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    api.tariffs.getProvinces().then(res => setProvinces(res.data.provinces || res.data || [])).catch(() => {});
  }, []);

  const policy = [
    { key: 'length', ok: form.password.length >= 8 },
    { key: 'lower', ok: /[a-z]/.test(form.password) },
    { key: 'upper', ok: /[A-Z]/.test(form.password) },
    { key: 'number', ok: /\d/.test(form.password) },
    { key: 'symbol', ok: /[^A-Za-z0-9]/.test(form.password) },
  ];

  const showChecklist = form.password.length > 0 || attempted;
  const passwordValid = policy.every(p => p.ok);
  const confirmTouched = form.confirm.length > 0;
  const confirmValid = confirmTouched && form.confirm === form.password;
  const formValid =
    form.name.trim().length >= 2 &&
    EMAIL_RE.test(form.email.trim()) &&
    passwordValid &&
    confirmValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    if (!formValid) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.provinceId || undefined);
      toast.success(t('register.success'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || t('register.error'));
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <Link to="/" className="auth-back" title={t('nav.back_home')} aria-label={t('nav.back_home')}>
        <ArrowLeft size={16} />
        {t('nav.back_home')}
      </Link>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Zap size={32} /></div>
          <h1>{t('register.title')}</h1>
          <p>{t('register.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">{t('register.name')}</label>
            <div className="input-with-icon">
              <User size={16} />
              <input className="form-input" type="text" value={form.name} onChange={update('name')} required placeholder={t('register.name_placeholder')} />
            </div>
            {attempted && form.name.trim().length < 2 && (
              <span className="field-error-text">{t('register.name_error')}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">{t('register.email')}</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input className="form-input" type="email" value={form.email} onChange={update('email')} required placeholder="tu@email.com" />
            </div>
            {attempted && !EMAIL_RE.test(form.email.trim()) && (
              <span className="field-error-text">{t('register.email_error')}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">{t('register.password')}</label>
            <div className="input-with-icon">
              <Lock size={16} />
              <input className="form-input" type="password" value={form.password} onChange={update('password')} required placeholder={t('register.password_placeholder')} aria-invalid={showChecklist && !passwordValid} />
            </div>
            {showChecklist && (
              <ul className="password-checklist">
                {policy.map(p => (
                  <li key={p.key} className={p.ok ? 'pc-ok' : 'pc-bad'}>
                    {p.ok ? <Check size={14} /> : <X size={14} />}
                    {t(`register.policy_${p.key}`)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">{t('register.confirm')}</label>
            <div className="input-with-icon">
              <Lock size={16} />
              <input className={`form-input ${confirmTouched && !confirmValid ? 'input-error' : ''}`} type="password" value={form.confirm} onChange={update('confirm')} required placeholder={t('register.confirm_placeholder')} aria-invalid={confirmTouched && !confirmValid} />
            </div>
            {confirmTouched && !confirmValid && (
              <span className="field-error-text">{t('register.confirm_mismatch')}</span>
            )}
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
          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={!formValid || loading}>
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
          {attempted && !formValid && (
            <p className="form-error" style={{ textAlign: 'center', marginTop: 10 }}>{t('register.policy_blocked')}</p>
          )}
        </form>
        <div className="auth-footer">
          {t('register.has_account')} <Link to="/login">{t('register.login_link')}</Link>
        </div>
      </div>
    </div>
  );
}