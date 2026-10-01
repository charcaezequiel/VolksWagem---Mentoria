/**
 * Render del panel de admin: App completa con token de admin.
 *
 * Es el gemelo de rutas.cjs para el otro rol. Monta el arbol entero (AdminRoute
 * incluido) porque el bug de <Outlet> vs children solo se ve pasando por el
 * guard.
 *
 *   node _harness/admin.cjs
 *   CE_TOKEN=... node _harness/admin.cjs
 */
const path = require('path');
const { FRONT, NODE_MODULES, mocksPorRuta } = require('./hook.cjs');

const API = 'http://localhost:3001/api';
const PROXY = 'http://localhost:3000';

const RUTAS = process.argv[2] ? [process.argv[2]] : [
  '/admin', '/admin/users', '/admin/tariffs', '/admin/catalog', '/admin/ai',
];

const montar = async (ruta) => {
  if (!global.__token) {
    if (process.env.CE_TOKEN) {
      global.__token = process.env.CE_TOKEN;
      global.__user = {};
    } else {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@controlar.com', password: process.env.CE_ADMIN_PW || 'Admin2026!' }),
      });
      const body = await res.json();
      if (!body.token) throw new Error('login fallo: ' + JSON.stringify(body).slice(0, 200));
      global.__token = body.token;
      global.__user = body.user;
    }
  }
  const token = global.__token;
  const user = global.__user;

  const { JSDOM } = require(path.join(NODE_MODULES, 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: `${PROXY}${ruta}`,
    pretendToBeVisual: true,
  });
  const { window } = dom;

  window.localStorage.setItem('token', token);
  window.localStorage.setItem('lang', process.env.CE_LANG || 'es');
  /* CE_DARK=1 arranca en modo noche. El tema se aplica sobre :root asi que
     hace falta el atributo en el elemento raiz del documento, no solo el
     atributo en localStorage.
     Ojo: jsdom no resuelve var(--x) en getComputedStyle, asi que el harness no
     puede medir contraste. Para eso esta _harness/contraste.cjs, que lee los
     tokens de App.css y compone los alfa a mano. */
  if (process.env.CE_DARK === '1') {
    window.document.documentElement.classList.add('dark');
    window.localStorage.setItem('theme', 'dark');
  } else {
    window.localStorage.setItem('theme', 'light');
  }

  class RO { observe() {} unobserve() {} disconnect() {} }
  window.ResizeObserver = RO;
  window.IntersectionObserver = RO;
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.FileReader = class { readAsText() {} addEventListener() {} };
  window.fetch = fetch;
  window.Headers = Headers;
  window.Request = Request;
  window.Response = Response;

  const W = 1200, H = 400;
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

  const errores = [];
  const origError = console.error;
  console.error = (...a) => { errores.push(a.map(String).join(' ')); origError(...a); };

  mocksPorRuta.set('react-hot-toast', {
    __esModule: true,
    default: { success: () => {}, error: (m) => errores.push('toast.error: ' + m) },
    Toaster: () => null,
  });

  const React = require(path.join(NODE_MODULES, 'react'));
  const ReactDOM = require(path.join(NODE_MODULES, 'react-dom', 'client'));
  const { BrowserRouter } = require(path.join(NODE_MODULES, 'react-router-dom'));
  const App = require(path.join(FRONT, 'src', 'App.js')).default;

  return { window, errores, React, ReactDOM, BrowserRouter, App, token, user };
};

(async () => {
  for (const ruta of RUTAS) {
    process.stdout.write(`\n=== ${ruta} ===\n`);
    const { window, errores, React, ReactDOM, BrowserRouter, App } = await montar(ruta);
    if (ruta === RUTAS[0]) console.log(`  Sesion: ${(global.__user.email || 'vía CE_TOKEN')} role=${global.__user.role}`);
    ReactDOM.createRoot(window.document.getElementById('root')).render(
      React.createElement(React.StrictMode, null,
        React.createElement(BrowserRouter, null, React.createElement(App)))
    );

    const limite = Date.now() + 20000;
    while (Date.now() < limite) {
      await new Promise((r) => setTimeout(r, 300));
      const txt = window.document.body.textContent || '';
      if (!/cargando|loading/i.test(txt)) break;
    }
    await new Promise((r) => setTimeout(r, 1500));

    const texto = (window.document.body.textContent || '').replace(/\s+/g, ' ').trim();
    console.log(`  chars: ${texto.length}`);
    console.log(`  graficos: ${window.document.querySelectorAll('svg.recharts-surface').length}`);
    console.log(`  tablas: ${window.document.querySelectorAll('table').length}`);
    console.log(`  filas de stat: ${window.document.querySelectorAll('.admin-stat').length}`);
    console.log(`  filas de barra: ${window.document.querySelectorAll('.admin-bar').length}`);
    const notaError = window.document.querySelector('.admin-error');
    if (notaError) console.log(`  NOTA DE ERROR EN PANTALLA: ${notaError.textContent}`);
    if (process.env.CE_FULL) {
      // Formularios de alta cierran por default: sin abrirlos no se verian los
      // hints, asi que se hace click por texto antes de contar.
      const abrir = process.env.CE_CLICK;
      if (abrir) {
        const btn = [...window.document.querySelectorAll('button')].find((b) =>
          (b.textContent || '').trim().includes(abrir));
        if (btn) {
          btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
          await new Promise((r) => setTimeout(r, 1200));
          console.log(`  click: "${abrir}" -> ${btn ? 'ok' : 'NO ENCONTRADO'}`);
        }
      }
      const hints = [...window.document.querySelectorAll('.field-hint')];
      const inputs = [...window.document.querySelectorAll('.admin-form input, .admin-form select, .admin-form-grid input, .admin-form-grid select')];
      const sinHint = inputs.filter((i) => {
        const label = i.closest('label');
        return label && !label.querySelector('.field-hint');
      }).length;
      console.log(`  hints: ${hints.length} | campos: ${inputs.length} | sin ayuda: ${sinHint}`);
      hints.slice(0, 6).forEach((h) => console.log(`    ~ ${h.textContent.slice(0, 110)}`));
    }
    if (errores.length) {
      console.log(`  ERRORES (${errores.length}):`);
      errores.slice(0, 5).forEach((e) => console.log('    ! ' + e.slice(0, 300)));
    }
    console.log(`  texto: ${texto.slice(0, 240)}`);
    if (process.env.CE_FULL) {
      const guide = window.document.querySelector('.admin-guide');
      console.log(`  --- GUIA (${guide ? 'presente' : 'AUSENTE'}) ---`);
      if (guide) {
        console.log(`   numeros: ${[...guide.querySelectorAll('.admin-guide-num')].map((n) => n.textContent).join(' ')} | button ir: ${guide.querySelectorAll('.admin-guide-go').length} | tareas: ${guide.querySelectorAll('.admin-guide-card li').length}`);
        guide.querySelectorAll('.admin-guide-card').forEach((card) => {
          const h = card.querySelector('h3');
          const go = card.querySelector('.admin-guide-go');
          const lis = [...card.querySelectorAll('li')].map((li) => li.textContent);
          console.log(`   * ${h && h.textContent}  ->  ${card.getAttribute('href')} [${go && go.textContent}]`);
          lis.forEach((li) => console.log(`       - ${li}`));
        });
        const foot = guide.querySelector('.admin-guide-foot');
        console.log(`   pie: ${foot ? foot.textContent : 'SIN PIE'}`);
      }
      const grupos = [...window.document.querySelectorAll('.admin-group')];
      console.log(`  --- GRUPOS (${grupos.length}) ---`);
      grupos.forEach((g) => {
        const t = g.querySelector('.admin-group-title');
        const h = g.querySelector('.admin-group-hint');
        console.log(`   * ${t ? t.textContent : '(sin titulo)'} | tarjetas: ${g.querySelectorAll('.admin-stat').length} | ${h ? h.textContent : ''}`);
      });
    }
  }
  process.exit(0);
})().catch((e) => { console.error('  FALLO: ' + (e.stack || e.message)); process.exit(1); });