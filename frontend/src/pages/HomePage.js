import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import Logo from '../components/common/Logo';
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
  UserPlus,
  Plug,
  PiggyBank,
  Check,
  ShieldAlert,
  Server,
  Smartphone,
  Cloud,
  ChevronDown,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const { t, lang, toggleLang } = useTranslation();
  const { dark, toggle: toggleTheme } = useTheme();

  const navLinks = [
    { href: '#how', label: t('home.nav.how') },
    { href: '#modules', label: t('home.nav.modules') },
    { href: '#ai', label: t('home.nav.ai') },
    { href: '#iot', label: t('home.nav.iot') },
    { href: '#tech', label: t('home.nav.tech') },
    { href: '#faq', label: t('home.nav.faq') },
  ];

  // Los numeros salen del seed: 116 appliances, 24 jurisdicciones x 9 rangos, 3 subsidios.
  const stats = [
    { value: '116', label: t('home.stat.appliances') },
    { value: '24', label: t('home.stat.provinces') },
    { value: '9', label: t('home.stat.ranges') },
    { value: '3', label: t('home.stat.subsidies') },
  ];

  const steps = [
    { icon: UserPlus, title: t('home.step1.title'), desc: t('home.step1.desc') },
    { icon: Plug, title: t('home.step2.title'), desc: t('home.step2.desc') },
    { icon: Brain, title: t('home.step3.title'), desc: t('home.step3.desc') },
    { icon: PiggyBank, title: t('home.step4.title'), desc: t('home.step4.desc') },
  ];

  const features = [
    {
      icon: LayoutDashboard,
      key: 'dashboard',
      to: '/dashboard',
      items: ['kpis', 'charts', 'realtime'],
    },
    {
      icon: Cpu,
      key: 'devices',
      to: '/devices',
      items: ['catalog', 'wizard', 'timers'],
    },
    {
      icon: Zap,
      key: 'consumption',
      to: '/consumption',
      items: ['readings', 'manual', 'breakdown'],
    },
    {
      icon: FileText,
      key: 'invoices',
      to: '/invoices',
      items: ['upload', 'compare', 'variation'],
    },
    {
      icon: Bell,
      key: 'alerts',
      to: '/alerts',
      items: ['peaks', 'anomalies', 'thresholds'],
    },
    {
      icon: Brain,
      key: 'predictions',
      to: '/predictions',
      items: ['forecast', 'breakdown', 'confidence'],
    },
    {
      icon: DollarSign,
      key: 'tariffs',
      to: '/tariffs',
      items: ['scales', 'subsidies', 'calculator'],
    },
    {
      icon: UserCircle,
      key: 'profile',
      to: '/profile',
      items: ['province', 'data', 'language'],
    },
  ];

  const aiPoints = [
    { icon: Brain, title: t('home.ai.p1.title'), desc: t('home.ai.p1.desc') },
    { icon: DollarSign, title: t('home.ai.p2.title'), desc: t('home.ai.p2.desc') },
    { icon: Sparkles, title: t('home.ai.p3.title'), desc: t('home.ai.p3.desc') },
    { icon: Bell, title: t('home.ai.p4.title'), desc: t('home.ai.p4.desc') },
  ];

  const tech = [
    { icon: Smartphone, key: 'frontend' },
    { icon: Server, key: 'backend' },
    { icon: Database, key: 'database' },
    { icon: Wifi, key: 'iot' },
    { icon: Cloud, key: 'deploy' },
  ];

  const faqs = Array.from({ length: 6 }, (_, i) => ({
    q: t(`home.faq.q${i + 1}`),
    a: t(`home.faq.a${i + 1}`),
  }));

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="home-logo">
          <Logo size={30} />
        </div>
        <div className="home-nav-links">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              {t('home.goto_dashboard')} <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="home-nav-anchor">{l.label}</a>
              ))}
              <Link to="/login" className="btn btn-primary">{t('home.login')}</Link>
              <Link to="/register" className="btn btn-secondary">{t('home.register')}</Link>
            </>
          )}
        </div>
      </nav>

      <header className="home-hero">
        <div className="home-hero-badge"><Sparkles size={16} /> {t('home.badge')}</div>
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
        <div className="home-hero-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">{t('home.goto_dashboard')}</Link>
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

      <main>
        <section className="home-section" id="how">
          <h2 className="home-section-title">{t('home.how_title')}</h2>
          <p className="home-section-subtitle">{t('home.how_subtitle')}</p>
          <div className="home-steps">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div className="home-step" key={title}>
                <div className="home-step-marker">
                  <Icon size={22} />
                  <span className="home-step-num">{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section home-section-alt" id="modules">
          <h2 className="home-section-title">{t('home.modules_title')}</h2>
          <p className="home-section-subtitle">{t('home.modules_subtitle')}</p>
          <div className="home-features-grid">
            {features.map(({ icon: Icon, key, to, items }) => (
              <Link to={to} className="home-feature-card" key={key}>
                <div className="home-feature-icon"><Icon size={26} /></div>
                <h3>{t(`home.feat.${key}.title`)}</h3>
                <p>{t(`home.feat.${key}.desc`)}</p>
                <ul className="home-feature-list">
                  {items.map((it) => (
                    <li key={it}>
                      <Check size={14} /> {t(`home.feat.${key}.${it}`)}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-section" id="ai">
          <h2 className="home-section-title">{t('home.ai_title')}</h2>
          <p className="home-section-subtitle">{t('home.ai_subtitle')}</p>
          <div className="home-ai-grid">
            {aiPoints.map(({ icon: Icon, title, desc }) => (
              <div className="home-ai-card" key={title}>
                <div className="home-ai-icon"><Icon size={20} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <div className="home-scope-note">
            <ShieldAlert size={20} />
            <div>
              <h4>{t('home.ai.scope_title')}</h4>
              <p>{t('home.ai.scope_desc')}</p>
            </div>
          </div>
        </section>

        <section className="home-section home-section-alt" id="iot">
          <h2 className="home-section-title">{t('home.iot_title')}</h2>
          <p className="home-section-subtitle">{t('home.iot_subtitle')}</p>
          <div className="home-iot">
            <div className="home-iot-card">
              <Wifi size={28} />
              <h3>ESP8266MOD</h3>
              <p>{t('home.iot_mcu_desc')}</p>
            </div>
            <div className="home-iot-arrow">→</div>
            <div className="home-iot-card">
              <Gauge size={28} />
              <h3>PZEM-004T v3.0 + bobina CT</h3>
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
            {t('home.iot_note')} <code>arduino/esp8266_pzem_ct_monitor/</code>.
          </p>
        </section>

        <section className="home-section" id="tech">
          <h2 className="home-section-title">{t('home.tech_title')}</h2>
          <p className="home-section-subtitle">{t('home.tech_subtitle')}</p>
          <div className="home-tech-grid">
            {tech.map(({ icon: Icon, key }) => (
              <div className="home-tech-card" key={key}>
                <div className="home-tech-icon"><Icon size={22} /></div>
                <h3>{t(`home.tech.${key}.title`)}</h3>
                <p>{t(`home.tech.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section home-section-alt" id="faq">
          <h2 className="home-section-title">{t('home.faq_title')}</h2>
          <p className="home-section-subtitle">{t('home.faq_subtitle')}</p>
          <div className="home-faq">
            {faqs.map((f) => (
              <details className="home-faq-item" key={f.q}>
                <summary>
                  {f.q}
                  <ChevronDown size={18} />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="home-cta">
          <h2>{t('home.cta_title')}</h2>
          <p>{t('home.cta_subtitle')}</p>
          <div className="home-hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">{t('home.goto_dashboard')}</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">{t('home.start_free')}</Link>
                <Link to="/login" className="btn btn-secondary btn-lg">{t('home.login')}</Link>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-logo">
          <Logo size={30} text="ControlAR" sub=" Energía" />
        </div>
        <p>{t('home.footer')}</p>
      </footer>

      {/* Controles flotantes, solo en el index: idioma y tema. Son los mismos
          toggles del Header de la app, con los mismos textos, para que se
          comporten igual en los dos lugares. */}
      <div className="home-float-controls">
        <button
          type="button"
          className="home-float-btn"
          onClick={toggleLang}
          title={t('header.toggle_lang')}
          aria-label={t('header.toggle_lang')}
        >
          <Globe size={20} />
          {/* El codigo va como badge superpuesto: si fuera parte del flex, el
              boton se estiraria y dejaria de ser un circulo. */}
          <span className="home-float-btn-tag">{lang.toUpperCase()}</span>
        </button>
        <button
          type="button"
          className="home-float-btn"
          onClick={toggleTheme}
          title={dark ? t('header.theme_light') : t('header.theme_dark')}
          aria-label={dark ? t('header.theme_light') : t('header.theme_dark')}
          aria-pressed={dark}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  );
}
