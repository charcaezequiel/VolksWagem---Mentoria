/**
 * Comprueba que las traducciones ES y EN tengan exactamente las mismas claves.
 * Una clave que existe en un idioma y no en el otro se renderiza como texto
 * crudo en pantalla, que es como aparecen bugs de idioma "que no puedo leer".
 */
const path = require('path');
const { FRONT } = require('./hook.cjs');

const translations = require(path.join(FRONT, 'src', 'i18n', 'translations.js')).default;

const idiomas = Object.keys(translations);
console.log('  Idiomas: ' + idiomas.join(', '));

const claves = Object.fromEntries(
  idiomas.map((k) => [k, new Set(Object.keys(translations[k]))]),
);

for (const lang of idiomas) console.log(`  ${lang}: ${claves[lang].size} claves`);

const base = idiomas[0];
let problemas = 0;
for (const lang of idiomas.slice(1)) {
  const faltan = [...claves[base]].filter((k) => !claves[lang].has(k));
  const sobran = [...claves[lang]].filter((k) => !claves[base].has(k));
  console.log(`\n  ${base} -> ${lang}`);
  console.log(`    faltan en ${lang}: ${faltan.length}${faltan.length ? '  ' + faltan.join(', ') : ''}`);
  console.log(`    sobran en ${lang}: ${sobran.length}${sobran.length ? '  ' + sobran.join(', ') : ''}`);
  problemas += faltan.length + sobran.length;
}

// Valores con el marcador de reemplazo: acentos rotos por codificacion.
for (const lang of idiomas) {
  const rotos = Object.entries(translations[lang])
    .filter(([, v]) => typeof v === 'string' && v.includes('\uFFFD'))
    .map(([k]) => k);
  console.log(`  ${lang}: ${rotos.length} valor(es) con U+FFFD${rotos.length ? '  ' + rotos.join(', ') : ''}`);
  problemas += rotos.length;
}

// Valores que aun tienen el formato de clave sin reemplazar.
for (const lang of idiomas) {
  const sinTraducir = Object.entries(translations[lang])
    .filter(([k, v]) => typeof v === 'string' && v === k)
    .map(([k]) => k);
  console.log(`  ${lang}: ${sinTraducir.length} clave(s) sin traducir`);
  problemas += sinTraducir.length;
}

console.log(problemas === 0 ? '\n  OK: traducciones consistentes.' : `\n  ${problemas} problema(s).`);
process.exit(problemas === 0 ? 0 : 1);
