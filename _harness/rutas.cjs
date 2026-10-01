/**
 * Render del arbol COMPLETO de App (con ProtectedRoute / CustomerRoute / Layout).
 *
 * dashboard.cjs monta DashboardPage directo, asi que se saltea justo lo que
 * puede estar rompiendo: los guards y el Layout. Esta variante monta App con
 * la ruta que se pide, para ver si la pagina llega a renderizar o si un guard
 * la expulsa.
 *
 *   node _harness/rutas.cjs            # recorre varias rutas
 *   node _harness/rutas.cjs /consumption
 */
const path = require('path');
const { FRONT, NODE_MODULES, mocksPorRuta } = require('./hook.cjs');

const API = 'http://localhost:3001/api';
const PROXY = 'http://localhost:3000';

const RUTAS = process.argv[2] ? [process.argv[2]] : [
  '/dashboard', '/devices', '/consumption', '/invoices',
  '/alerts', '/predictions', '/tariffs', '/profile', '/recommendations',
];

const montar = async (ruta) => {
  // Token real de la cuenta de cliente. El backend limita los intentos de
  // login por IP (15 cada 15 min), asi que el token se pide una sola vez y se
  // reusa entre rutas. CE_TOKEN lo exporta quien corre el script para no
  // depender de esa cuota.
  if (!global.__token) {
    if (process.env.CE_TOKEN) {
      global.__token = process.env.CE_TOKEN;
      global.__user = {};
    } else {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@controlar.com', password: '123456' }),
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
  window.localStorage.setItem('lang', 'es');

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

  // Socket real incluido: si el Context revienta, hay que verlo.
  mocksPorRuta.set('react-hot-toast', {
    __esModule: true,
    default: { success: () => {}, error: (m) => errores.push('toast.error: ' + m) },
    // App.js importa Toaster de este mismo modulo: sin stub queda undefined y
    // revienta todo el arbol, no la pagina que se quiere probar.
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
    // Un jsdom por ruta: los providers son stateful y no se wanta reusar.
    process.stdout.write(`\n=== ${ruta} ===\n`);
    const { window, errores, React, ReactDOM, BrowserRouter, App } = await montar(ruta);
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
    if (errores.length) {
      console.log(`  ERRORES (${errores.length}):`);
      errores.slice(0, 6).forEach((e) => console.log('    ! ' + e.slice(0, 400)));
    }
    console.log(`  texto: ${texto.slice(0, 260)}`);
  }
  process.exit(0);
})().catch((e) => { console.error('  FALLO: ' + (e.stack || e.message)); process.exit(1); });