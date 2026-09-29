/**
 * Render real de DashboardPage: jsdom + backend real + proxy real.
 *
 *   node _harness/dashboard.cjs
 */
const path = require('path');
const { FRONT, NODE_MODULES, mocksPorRuta, Module } = require('./hook.cjs');

const PROXY = 'http://localhost:3000';
const API = 'http://localhost:3001/api';

// --- 1. Token real de la cuenta de cliente -------------------------------
(async () => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@controlar.com', password: '123456' }),
  });
  const { token, user } = await res.json();
  if (!token) throw new Error('login fallo: ' + JSON.stringify(user));
  console.log(`  Sesion: ${user.email}  role=${user.role}  provincia=${user.province_id}`);

  // --- 2. jsdom apuntando al proxy de CRA -------------------------------
  const { JSDOM } = require(path.join(NODE_MODULES, 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: `${PROXY}/dashboard`,
    pretendToBeVisual: true,
  });
  const { window } = dom;

  window.localStorage.setItem('token', token);
  window.localStorage.setItem('user', JSON.stringify(user));
  window.localStorage.setItem('lang', 'es');

  class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
  window.ResizeObserver = ResizeObserver;
  class IntersectionObserver { observe() {} unobserve() {} disconnect() {} }
  window.IntersectionObserver = IntersectionObserver;
  window.matchMedia = window.matchMedia || function () {
    return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} };
  };
  window.scrollTo = () => {};
  window.FileReader = class { readAsText() {} addEventListener() {} };

  // ResponsiveContainer de Recharts mide offsetWidth/offsetHeight y, si da 0,
  // no renderiza nada. En un navegador real tiene ancho. Aca hay que
  // inventarlo, o los tres graficos aparecen vacios y el test no prueba nada
  // sobre si los datos llegan al grafico.
  const W = 800, H = 300;
  Object.defineProperties(window.HTMLElement.prototype, {
    offsetWidth: { get() { return W; }, configurable: true },
    offsetHeight: { get() { return H; }, configurable: true },
    clientWidth: { get() { return W; }, configurable: true },
    clientHeight: { get() { return H; }, configurable: true },
  });
  window.Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, top: 0, left: 0, right: W, bottom: H, width: W, height: H, toJSON() {} };
  };

  for (const k of ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
    'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MutationObserver',
    'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver',
    'IntersectionObserver', 'matchMedia', 'Blob', 'File', 'FileReader', 'URL', 'DOMParser']) {
    global[k] = window[k];
  }
  global.self = window;

  // --- 3. Mocks minimos: nada de sockets ni toasts en este test ---------
  const toasts = [];
  const socketHandlers = new Set();

  mocksPorRuta.set('../context/SocketContext', {
    __esModule: true,
    useSocket: () => ({ connected: false, on: (_e, cb) => { socketHandlers.add(cb); return () => socketHandlers.delete(cb); } }),
  });
  mocksPorRuta.set('react-hot-toast', {
    __esModule: true,
    default: {
      success: (m) => toasts.push(['success', m]),
      error: (m) => toasts.push(['error', m]),
    },
  });

  // --- 4. Montar ---------------------------------------------------------
  const React = require(path.join(NODE_MODULES, 'react'));
  const ReactDOM = require(path.join(NODE_MODULES, 'react-dom', 'client'));
  const { MemoryRouter } = require(path.join(NODE_MODULES, 'react-router-dom'));
  const { LanguageProvider } = require(path.join(FRONT, 'src', 'context', 'LanguageContext.js'));
  const { ThemeProvider } = require(path.join(FRONT, 'src', 'context', 'ThemeContext.js'));
  const DashboardPage = require(path.join(FRONT, 'src', 'pages', 'DashboardPage.js')).default;

  const h = React.createElement;
  ReactDOM.createRoot(document.getElementById('root')).render(
    h(React.StrictMode, null,
      h(ThemeProvider, null,
        h(LanguageProvider, null,
          h(MemoryRouter, null,
            h(DashboardPage)))),
    ),
  );

  // --- 5. Esperar a que se resuelvan los 5 requests ---------------------
  const limite = Date.now() + 25000;
  const spinner = () => document.body.textContent.trim();
  while (Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 300));
    if (!/cargando|loading/i.test(spinner())) break;
  }
  await new Promise((r) => setTimeout(r, 1200));

  // --- 6. Informe --------------------------------------------------------
  const texto = document.body.textContent;
  const svg = document.querySelectorAll('svg.recharts-surface').length;

  console.log(`\n  Texto renderizado: ${texto.length} caracteres`);
  console.log(`  Graficos (recharts-surface): ${svg}`);
  console.log(`  Toasts de error: ${toasts.filter((t) => t[0] === 'error').length}` +
    (toasts.length ? `  -> ${JSON.stringify(toasts)}` : ''));
  console.log(`  Marcadores U+FFFD (texto roto): ${(texto.match(/\uFFFD/g) || []).length}`);

  console.log('\n  --- Valores visibles ---');
  for (const etiq of ['543', '4.19', '18.7', '78.7', '56.7']) {
    console.log(`    ${etiq.padEnd(8)} ${texto.includes(etiq) ? 'presente' : 'AUSENTE'}`);
  }

  console.log('\n  --- Graficos con datos ---');
  for (const sel of ['.recharts-line', '.recharts-bar-rectangle', '.recharts-pie-sector', '.recharts-surface']) {
    console.log(`    ${sel.padEnd(28)} ${document.querySelectorAll(sel).length}`);
  }

  console.log('\n  --- Ejes del grafico diario (deben ser los dias) ---');
  const ticks = [...document.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value tspan')]
    .map((n) => n.textContent).filter(Boolean);
  console.log('    ' + (ticks.length ? ticks.join('  ') : '(sin ticks)'));

  const yTicks = [...document.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value tspan')]
    .map((n) => n.textContent).filter(Boolean);
  console.log('  --- Eje Y del grafico diario ---');
  console.log('    ' + (yTicks.length ? yTicks.join('  ') : '(sin ticks)'));

  const leyenda = [...document.querySelectorAll('.recharts-legend-item-text')].map((n) => n.textContent);
  console.log('  --- Leyendas ---');
  console.log('    ' + (leyenda.length ? leyenda.join(' | ') : '(sin leyenda)'));

  console.log('\n  --- Primeras 700 caracteres ---');
  console.log('    ' + texto.replace(/\s+/g, ' ').slice(0, 700));

  process.exit(0);
})().catch((e) => { console.error('  FALLO: ' + (e.stack || e.message)); process.exit(1); });
