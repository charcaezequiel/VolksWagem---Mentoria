import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import {
  LayoutDashboard,
  Cpu,
  Zap,
  FileText,
  Bell,
  Brain,
  DollarSign,
  UserCircle,
  Wifi,
  Gauge,
  Database,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const features = [
    {
      icon: LayoutDashboard,
      title: t('home.feat.dashboard.title'),
      desc: t('home.feat.dashboard.desc'),
    },
    {
      icon: Cpu,
      title: t('home.feat.devices.title'),
      desc: t('home.feat.devices.desc'),
    },
    {
      icon: Zap,
      title: t('home.feat.consumption.title'),
      desc: t('home.feat.consumption.desc'),
    },
    {
      icon: FileText,
      title: t('home.feat.invoices.title'),
      desc: t('home.feat.invoices.desc'),
    },
    {
      icon: Bell,
      title: t('home.feat.alerts.title'),
      desc: t('home.feat.alerts.desc'),
    },
    {
      icon: Brain,
      title: t('home.feat.ai_prediction.title'),
      desc: t('home.feat.ai_prediction.desc'),
    },
    {
      icon: DollarSign,
      title: t('home.feat.tariffs.title'),
      desc: t('home.feat.tariffs.desc'),
    },
    {
      icon: UserCircle,
      title: t('home.feat.profile.title'),
      desc: t('home.feat.profile.desc'),
    },
  ];

  const stats = [
    { value: '107', label: t('home.stat.appliances') },
    { value: '6', label: t('home.stat.provinces') },
    { value: '3', label: t('home.stat.ranges') },
    { value: 'IA', label: t('home.stat.prediction') },
  ];

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="home-logo">⚡ ControlAR</div>
        <div className="home-nav-links">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              {t('home.goto_dashboard')} <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">{t('home.login')}</Link>
              <Link to="/register" className="btn btn-secondary">{t('home.register')}</Link>
            </>
          )}
        </div>
      </nav>

      <header className="home-hero">
        <div className="home-hero-badge"><Sparkles size={16} /> {t('home.badge')}</div>
        <h1>{t('home.title')}</h1>
        <p>
          {t('home.subtitle')}
        </p>
        <div className="home-hero-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">Ver mi Dashboard</Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">{t('home.start_free')}</Link>
              <Link to="/login" className="btn btn-secondary btn-lg">{t('home.login')}</Link>
            </>
          )}
        </div>
      </header>

      <section className="home-stats-band">
        {stats.map((s) => (
          <div className="home-stat" key={s.label}>
            <div className="home-stat-value">{s.value}</div>
            <div className="home-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      <main className="home-section">
        <h2 className="home-section-title">{t('home.features_title')}</h2>
        <p className="home-section-subtitle">{t('home.features_subtitle')}</p>
        <div className="home-features-grid">
          {features.map(({ icon: Icon, title, desc }) => (
            <div className="home-feature-card" key={title}>
              <div className="home-feature-icon"><Icon size={26} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <section className="home-section">
        <h2 className="home-section-title">{t('home.iot_title')}</h2>
        <p className="home-section-subtitle">
          {t('home.iot_subtitle')}
        </p>
        <div className="home-iot">
          <div className="home-iot-card">
            <Wifi size={28} />
            <h3>ESP32</h3>
            <p>{t('home.iot_esp32_desc')}</p>
          </div>
          <div className="home-iot-arrow">→</div>
          <div className="home-iot-card">
            <Gauge size={28} />
            <h3>PZEM-004T v3.0</h3>
            <p>{t('home.iot_pzem_desc')}</p>
          </div>
          <div className="home-iot-arrow">→</div>
          <div className="home-iot-card">
            <Database size={28} />
            <h3>API REST + PostgreSQL</h3>
            <p>{t('home.iot_api_desc')}</p>
          </div>
        </div>
        <p className="home-iot-note">
          {t('home.iot_note')} <code>arduino/esp32_pzem_monitor/</code>.
        </p>
      </section>

      <footer className="home-footer">
        <div className="home-logo">⚡ ControlAR Energía</div>
        <p>{t('home.footer')}</p>
      </footer>
    </div>
  );
}
