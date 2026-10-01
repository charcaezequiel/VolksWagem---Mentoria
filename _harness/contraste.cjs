/**
 * Contraste de la guia del admin, leido de los tokens reales de App.css.
 *
 * Por que no se mide con getComputedStyle en jsdom: jsdom no resuelve
 * var(--x), devuelve la propiedad vacia y cualquier medicion seria inventada.
 * Aca se parsea el CSS, se resuelven los tokens del tema pedido y se calcula el
 * ratio WCAG sobre los pares de color que la guia usa de verdad.
 *
 *   node _harness/contraste.cjs        # modo dia
 *   node _harness/contraste.cjs night  # modo noche
 */
const fs = require('fs');
const path = require('path');

const CSS = path.join(__dirname, '..', 'frontend', 'src', 'styles', 'App.css');
const tema = process.argv[2] === 'night' ? 'night' : 'day';

const css = fs.readFileSync(CSS, 'utf8');

/* Extrae un bloque y devuelve sus tokens. El selector llega ya como patron
   (con sus ^ y lookaheads), asi que va directo a RegExp: escaparlo y volver a
   anteponer ^ buscaria un "^" literal y no encontraria nada. */
/* El flag m es obligatorio: sin el, ^ solo matchea el comienzo del archivo y el
   bloque :root de la linea 14 no se encuentra. */
const bloque = (patron) => {
  const re = new RegExp(`${patron}\\s*\\{([^}]*)\\}`, 'gm');
  let m;
  let cuerpo = '';
  while ((m = re.exec(css)) !== null) cuerpo += m[1] + '\n';
  const tokens = {};
  cuerpo.split('\n').forEach((line) => {
    const t = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);/);
    if (t) tokens[t[1]] = t[2].trim();
  });
  return tokens;
};

/* El :root claro es el primero del archivo. El negativo evita que entre el
   bloque :root.dark, que es un selector distinto. */
const light = bloque('^:root(?![.\\w-])');
const dark = { ...light, ...bloque('^:root\\.dark') };
const tokens = tema === 'night' ? dark : light;

if (tokens['--text'] === undefined) {
  console.error('No se pudo leer el bloque :root. Revisar el parser.');
  process.exit(2);
}

/* Resuelve un color a [r,g,b,a]. Un token translucido (rgba con alpha < 1) NO se
   puede medir solo: hay que componerlo sobre el fondo real que tiene detras, si
   no el calculo da un ratio inventado. Por eso cada par declara su "sobre". */
const hex = (v) => {
  const s = String(v).trim();
  const h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (h) {
    const d = h[1].length === 3 ? h[1].split('').map((c) => c + c).join('') : h[1];
    return [0, 2, 4].map((i) => parseInt(d.slice(i, i + 2), 16)).concat(1);
  }
  const r = s.match(/rgba?\(([^)]+)\)/i);
  if (r) {
    const p = r[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length === 4 ? p[3] : 1];
  }
  return null;
};

const resolve = (valor) => {
  /* El grupo captura los -- junto al nombre: si se capturara sin ellos,
     tokens['text'] seria undefined y todo quedaria sin resolver. */
  const m = String(valor).match(/var\((--[\w-]+)\)/);
  if (m) {
    const t = tokens[m[1]];
    if (t === undefined) return { valor: null, falta: m[1] };
    return resolve(t);
  }
  const rgb = hex(valor);
  if (!rgb) return { valor: null, falta: `no parseable: ${valor}` };
  return { valor: rgb };
};

/* Compone un color con alfa sobre un fondo opaco (formula source-over). */
const componer = (c, fondo) => {
  if (c[3] >= 1) return c.slice(0, 3);
  const a = c[3];
  return [0, 1, 2].map((i) => Math.round(c[i] * a + fondo[i] * (1 - a)));
};

const lum = (rgb) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* Cada par: [nombre, color del texto, color del fondo, que hay detras del
   fondo]. El cuarto solo hace falta cuando el fondo es translucido; si el
   color del texto tambien es translucido, el fondo tiene que ser el plano. */
const PARES = [
  ['titulo guia (h2)', 'var(--text)', 'var(--bg-alt)', 'var(--surface)'],
  ['subtitulo guia (p)', 'var(--text-secondary)', 'var(--bg-alt)', 'var(--surface)'],
  ['subtitulo guia (noche)', 'var(--text)', 'var(--bg-alt)', 'var(--surface)'],
  ['titulo tarjeta (h3)', 'var(--text)', 'var(--surface)', 'var(--bg-alt)'],
  ['tarea tarjeta (li)', 'var(--text-secondary)', 'var(--surface)', 'var(--bg-alt)'],
  ['numero circulo', 'var(--primary)', 'var(--primary-tint)', 'var(--surface)'],
  ['boton Ir', 'var(--text-secondary)', 'var(--bg-alt)', 'var(--surface)'],
  ['boton Ir (hover)', 'var(--primary)', 'var(--bg-alt)', 'var(--surface)'],
  ['pie regla de oro', 'var(--on-tint-info)', 'var(--tint-info)', 'var(--surface)'],
  ['pie regla (variante noche)', 'var(--on-tint-violet)', 'var(--tint-violet)', 'var(--surface)'],
  ['ayuda campo', 'var(--text-secondary)', 'var(--surface)', 'var(--bg-alt)'],
  ['ayuda: chip ejemplo', 'var(--on-tint-info)', 'var(--tint-info)', 'var(--surface)'],
  ['ayuda: chip avanzado', 'var(--text-secondary)', 'var(--bg-alt)', 'var(--surface)'],
  ['ayuda: chip avanzado (noche)', 'var(--text-secondary)', 'var(--surface-2)', 'var(--surface)'],
  ['icono cabecera', 'var(--on-primary)', 'var(--primary)', null],
  /* El boton de reabrir la guia vive DENTRO del pie tintado, asi que su fondo
     es --surface sobre --tint-violet en oscuro, no sobre el fondo de la pagina. */
  ['boton reabrir', 'var(--text-secondary)', 'var(--surface)', 'var(--tint-violet)'],
  ['boton reabrir (hoy)', 'var(--text-secondary)', 'var(--surface)', 'var(--tint-info)'],
];

console.log(`\nCONTRASTE de la guia del admin — modo ${tema}\n`);
let fallos = 0;
PARES.forEach(([nombre, fg, bg, sobre]) => {
  const f = resolve(fg);
  const b = resolve(bg);
  if (!f.valor || !b.valor) {
    console.log(`  ??  ${nombre.padEnd(30)} sin resolver ${fg} sobre ${bg}`);
    fallos += 1;
    return;
  }
  /* El fondo del texto es el fondo compuesto sobre lo que haya detras; el
     texto, si es translucido, se compone sobre ese mismo fondo compuesto. */
  const fondoDetras = sobre ? resolve(sobre).valor : null;
  const bgPlano = fondoDetras ? componer(b.valor, fondoDetras.slice(0, 3)) : b.valor.slice(0, 3);
  const fgPlano = componer(f.valor, bgPlano);
  const r = ratio(fgPlano, bgPlano);
  const mal = r < 4.5;
  if (mal) fallos += 1;
  const hx = (c) => `#${c.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  console.log(`  ${mal ? 'FALLO' : 'ok   '} ${r.toFixed(2).padStart(5)}:1  ${nombre.padEnd(30)} ${hx(fgPlano)} sobre ${hx(bgPlano)}`);
});

console.log(
  fallos
    ? `\n${fallos} par(es) con problema\n`
    : `\nTodos los pares pasan 4.5:1\n`
);
process.exit(fallos ? 1 : 0);