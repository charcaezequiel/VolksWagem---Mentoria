import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Panel principal con KPIs en tiempo real: consumo total, costo estimado, dispositivos activos y alertas pendientes, acompañados de gráficos interactivos.',
  },
  {
    icon: Cpu,
    title: 'Dispositivos y Catálogo',
    desc: 'Alta, baja y edición de tus dispositivos. Un catálogo de 107 electrodomésticos agrupados por categoría autocompleta el nombre, los watts y las horas de uso típicas.',
  },
  {
    icon: Zap,
    title: 'Consumo',
    desc: 'Registro de lecturas de consumo (manuales o enviadas por el sensor IoT), gráficos de línea, resumen diario y mensual, consumo por dispositivo y medición en tiempo real.',
  },
  {
    icon: FileText,
    title: 'Facturas',
    desc: 'Carga de tus facturas de energía y comparación mes a mes con análisis de la variación porcentual del consumo y del costo.',
  },
  {
    icon: Bell,
    title: 'Alertas',
    desc: 'Notificaciones automáticas por picos de consumo, anomalías en dispositivos y superación de umbrales, con severidad (info, warning, critical) y control de lectura.',
  },
  {
    icon: Brain,
    title: 'Predicción IA de la boleta',
    desc: 'Motor de predicción propio que estima el consumo y el costo de la boleta del próximo mes (regresión lineal + estacionalidad) y lo desglosa por rango tarifario de tu provincia.',
  },
  {
    icon: DollarSign,
    title: 'Tarifas',
    desc: 'Tarifas eléctricas por provincia (OCEBA, EPRE, etc.) con rangos social, normal y alto, más calculadora de costo según el consumo.',
  },
  {
    icon: UserCircle,
    title: 'Perfil',
    desc: 'Gestión de tus datos personales y de tu provincia, que determina qué tarifas se aplican a tu consumo.',
  },
];

const stats = [
  { value: '107', label: 'electrodomésticos en el catálogo' },
  { value: '6', label: 'provincias con tarifas cargadas' },
  { value: '3', label: 'rangos tarifarios (social, normal, alto)' },
  { value: 'IA', label: 'predicción de la boleta del próximo mes' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="home-logo">⚡ ControlAR</div>
        <div className="home-nav-links">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              Ir al Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">Ingresar</Link>
              <Link to="/register" className="btn btn-secondary">Crear cuenta</Link>
            </>
          )}
        </div>
      </nav>

      <header className="home-hero">
        <div className="home-hero-badge"><Sparkles size={16} /> Monitoreo inteligente del consumo energético</div>
        <h1>Controlá, analizá y predecí tu consumo de energía</h1>
        <p>
          ControlAR Energía es una aplicación web que monitorea tus dispositivos, analiza tu consumo,
          detecta anomalías y <strong>predice cuánto vas a pagar en tu próxima boleta de luz</strong>,
          aplicando las tarifas de tu provincia.
        </p>
        <div className="home-hero-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">Ver mi Dashboard</Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">Empezar gratis</Link>
              <Link to="/login" className="btn btn-secondary btn-lg">Ingresar</Link>
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
        <h2 className="home-section-title">Todo lo que hace ControlAR</h2>
        <p className="home-section-subtitle">Ocho módulos para monitorear y ahorrar energía en tu hogar.</p>
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
        <h2 className="home-section-title">Integración con sensor IoT</h2>
        <p className="home-section-subtitle">
          Conectá un ESP32 con un medidor PZEM-004T y tus mediciones llegan solas a la base de datos.
        </p>
        <div className="home-iot">
          <div className="home-iot-card">
            <Wifi size={28} />
            <h3>ESP32</h3>
            <p>Microcontrolador con Wi-Fi que lee el medidor y envía los datos por HTTP.</p>
          </div>
          <div className="home-iot-arrow">→</div>
          <div className="home-iot-card">
            <Gauge size={28} />
            <h3>PZEM-004T v3.0</h3>
            <p>Mide voltaje, corriente, potencia activa, energía acumulada, frecuencia y factor de potencia.</p>
          </div>
          <div className="home-iot-arrow">→</div>
          <div className="home-iot-card">
            <Database size={28} />
            <h3>API REST + PostgreSQL</h3>
            <p>Las lecturas se guardan en la base y se visualizan al instante en la web.</p>
          </div>
        </div>
        <p className="home-iot-note">
          Código de ejemplo del sensor incluido en <code>arduino/esp32_pzem_monitor/</code>.
        </p>
      </section>

      <footer className="home-footer">
        <div className="home-logo">⚡ ControlAR Energía</div>
        <p>Prácticas Profesionalizantes · Monitoreo, análisis y predicción del consumo energético residencial argentino.</p>
      </footer>
    </div>
  );
}
