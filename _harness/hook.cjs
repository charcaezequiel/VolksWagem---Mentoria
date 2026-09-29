/**
 * Base para los scripts de verificacion de _harness/.
 *
 * El proyecto no tiene tests, asi que estos scripts hacen el trabajo a mano:
 * compilan el JSX con el mismo Babel que usa CRA, resuelven los imports y
 * permiten interceptar modulos sin jest.
 *
 * Que resuelve, en concreto:
 *  - `require.extensions` para pasar cada .js del src por @babel/preset-react.
 *    Sin esto, `import` y JSX no existen en node.
 *  - Un mapa de mocks por especificador EXACTO ('../context/SocketContext').
 *    Importa esa direccion: los .js del src usan rutas relativas, y el nombre
 *    de la carpeta cambia segun quien llama. Un mock por nombre de archivo no
 *    se activaria nunca.
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const FRONT = path.join(__dirname, '..', 'frontend');
const NODE_MODULES = path.join(FRONT, 'node_modules');

// @babel/core vive en frontend/node_modules, no en el raiz. Sin el path
// explicito, require() desde _harness/ no lo encuentra.
const babel = require(path.join(NODE_MODULES, '@babel', 'core'));

// --- transformador de JSX/ESM -------------------------------------------
const babelOpts = {
  babelrc: false,
  configFile: false,
  presets: [
    [require.resolve('@babel/preset-env', { paths: [FRONT] }), { targets: { node: 'current' } }],
    [require.resolve('@babel/preset-react', { paths: [FRONT] }), { runtime: 'classic' }],
  ],
  plugins: [],
};

const compilar = (code, filename) =>
  babel.transformSync(code, { ...babelOpts, filename }).code;

require.extensions['.js'] = (mod, filename) => {
  if (filename.includes('node_modules')) return mod._compile(fs.readFileSync(filename, 'utf8'), filename);
  mod._compile(compilar(fs.readFileSync(filename, 'utf8'), filename), filename);
};

// --- resolucion de modulos con mock por ruta -----------------------------
const mocksPorRuta = new Map();

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (parent && mocksPorRuta.has(request)) return request;
  try {
    return origResolve.call(this, request, parent, ...rest);
  } catch (e) {
    if (request.startsWith('.')) return path.resolve(path.dirname(parent.filename), request);
    throw e;
  }
};

const modOriginal = Module._load;
Module._load = function (request, parent, isMain) {
  if (mocksPorRuta.has(request)) return mocksPorRuta.get(request);
  if (request.startsWith('.')) return modOriginal.call(this, origResolve.call(this, request, parent), parent, isMain);
  return modOriginal.call(this, request, parent, isMain);
};

module.exports = { FRONT, NODE_MODULES, mocksPorRuta };
