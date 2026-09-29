import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';

/**
 * Lectura de archivos de tarifario (CSV y XLSX) para la carga masiva.
 *
 * Por que NO se usa la libreria `xlsx` de npm: la version publicada en el
 * registro se quedo en 0.18.5 (2022) y tiene CVEs de prototype pollution y
 * ReDoS. SheetJS sigue publicando en su propio CDN, no en npm. Acá se usan dos
 * librerias chicas y mantenidas: papaparse para CSV y read-excel-file para XLSX.
 *
 * Todo entra por un mismo camino: el archivo se convierte a una matriz de
 * celdas y despues se mapea a filas de tarifario. Asi el CSV y el Excel se
 * validan con exactamente las mismas reglas.
 */

/* Formatos aceptados en el <input type="file">. */
export const ACCEPTED_EXTENSIONS = '.csv,.xlsx,.xls';

/** Cantidad maxima de filas que se toman del archivo, para no colar la UI. */
const MAX_ROWS = 500;

/**
 * Como se ve una columna en un tarifario de verdad vs como lo busca el parser.
 * Se comparan nombres ya normalizados (ver `normalizar`): sin acentos, sin
 * mayusculas, sin puntuacion. Asi "Precio N1", "precio_n1" y "PRECIO/N1" caen
 * en la misma clave.
 */
const ALIAS = {
  categoria: ['categoria', 'escalon', 'rango', 'tramo', 'nivel', 'category', 'tier', 'escalonr', 'r', 'categoria r'],
  tier_from: ['desde', 'desdekwh', 'desdekwh', 'from', 'tierfrom', 'kwhdesde', 'inicio', 'consumodesde', 'desde kwh', 'limiteinferior', 'desdeconsumo'],
  tier_to: ['hasta', 'hastakwh', 'to', 'tiertо', 'tierton', 'kwhhasta', 'fin', 'consumohasta', 'hasta kwh', 'limitesuperior', 'hastaconsumo'],
  precio_n1: ['precio', 'preciokwh', 'precion1', 'n1', 'tarifakwh', 'price', 'preciokwhn1', 'precio1', 'valor', 'preciounitario'],
  precio_n2: ['n2', 'precion2', 'precio2', 'preciokwhn2', 'precion2', 'segundonivel', '2doescalon'],
  precio_n3: ['n3', 'precion3', 'precio3', 'preciokwhn3', 'precion3', 'tercernivel', '3erescalon'],
  cargo_fijo: ['cargofijo', 'fijo', 'cargo', 'fixed', 'fixedcharge', 'cargo fijo', 'cargoimporte', 'cuotafija'],
  provincia: ['provincia', 'province', 'idprovincia'],
};

/** Sin acentos, sin mayusculas, sin todo lo que no sea letra o digito. */
const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Indice de alias -> columna real del archivo. */
function mapearColumnas(encabezados) {
  const normalizados = encabezados.map(normalizar);
  const mapa = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    const i = normalizados.findIndex((h) => alias.includes(h));
    if (i !== -1 && mapa[campo] === undefined) mapa[campo] = i;
  }
  return mapa;
}

/**
 * Convierte una celda a numero.
 *
 * El detalle que importa: un tarifario exportado desde Excel en español trae
 * "132,50" con COMA decimal, y a veces "$ 1.234,56". Tomar eso con
 * Number() da NaN o 132.5 segun el caso, asi que se normaliza antes:
 *  - si hay punto Y coma, el ULTIMO separador es el decimal;
 *  - si hay solo coma, es decimal (es el caso argentino, no de miles);
 *  - los simbolos de moneda y los espacios se van.
 *
 * Devuelve '' cuando la celda esta vacia, que es como el formulario distingue
 * "no aplica" (null) de "cero real".
 */
function aNumero(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : '';
  let s = String(valor).trim();
  if (s === '') return '';
  // "infinito", "+Inf", "∞" no son un limite superior: se traduce a vacio.
  if (/^(infinito|inf|infinity|\+inf|∞|-)$/i.test(s)) return '';
  s = s.replace(/[^0-9.,-]/g, '');
  if (s === '') return '';
  const ultimaComa = s.lastIndexOf(',');
  const ultimoPunto = s.lastIndexOf('.');
  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    // El separador decimal es el que aparece mas a la derecha.
    if (ultimaComa > ultimoPunto) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (ultimaComa !== -1) {
    s = s.replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    // "1.234.567" es miles, no un decimal con puntos de mas.
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : '';
}

/**
 * Normaliza el nombre de una provincia para poder compararlo sin que el ruido
 * rompa la coincidencia: "Ciudad Autónoma de Buenos Aires" y "CABA" son cosas
 * distintas, pero "Buenos Aires" y "Buenos Aires (AMBA)" tienen quepiasar.
 * Por eso la comparacion final es la de `sameProvincia`, no una igualdad.
 */
const normProvincia = (s) => normalizar(s).replace(/dela|del/g, '');

/**
 * Convierte la matriz cruda del archivo en filas de tarifario.
 *
 * @param {any[][]} matriz  primera fila = encabezados
 * @returns {{ rows: object[], avisos: string[], provincia: string|null }}
 */
function matrizAFilas(matriz) {
  const avisos = [];
  if (!matriz || matriz.length < 2) {
    return { rows: [], avisos: ['El archivo no tiene filas de datos.'], provincia: null };
  }

  // Se busca la fila de encabezados entre las primeras:manyas planillas
  // arrancan con un titulo o una celda en blanco antes de la tabla.
  let inicio = 0;
  for (; inicio < Math.min(5, matriz.length - 1); inicio += 1) {
    if (mapearColumnas(matriz[inicio]).tier_from !== undefined) break;
  }
  const encabezados = matriz[inicio] || [];
  const mapa = mapearColumnas(encabezados);
  if (mapa.tier_from === undefined) {
    return {
      rows: [],
      avisos: ['No encontre una columna "desde kWh". Revisa los encabezados del archivo.'],
      provincia: null,
    };
  }
  if (mapa.precio_n1 === undefined) {
    return {
      rows: [],
      avisos: ['No encontre una columna de precio (N1). Revisa los encabezados del archivo.'],
      provincia: null,
    };
  }
  if (inicio > 0) avisos.push(`Se ignoraron las ${inicio} fila(s) de arriba: no son parte de la tabla.`);

  const celda = (fila, campo) => (mapa[campo] === undefined ? '' : (fila[mapa[campo]] ?? ''));

  const cuerpo = matriz.slice(inicio + 1, inicio + 1 + MAX_ROWS);
  if (matriz.length - 1 - inicio > MAX_ROWS) {
    avisos.push(`El archivo tiene mas de ${MAX_ROWS} filas: solo se toman las primeras ${MAX_ROWS}.`);
  }

  const filas = [];
  for (const fila of cuerpo) {
    // Fila totalmente vacia: es separacion de bloques dentro de la planilla.
    if (fila.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;

    const desde = aNumero(celda(fila, 'tier_from'));
    const hasta = aNumero(celda(fila, 'tier_to'));
    const precio = aNumero(celda(fila, 'precio_n1'));

    if (desde === '' || precio === '') {
      avisos.push(`Fila sin "desde" o sin precio, se saltea: ${String(celda(fila, 'categoria') || '?')}.`);
      continue;
    }

    filas.push({
      categoria: String(celda(fila, 'categoria') || '').trim(),
      tier_from: desde,
      tier_to: hasta,
      price_per_kwh: precio,
      // null en la BD = "este escalon no tiene segundo nivel". Vacio y null
      // significan lo mismo aca, y el backend lo traduce.
      price_per_kwh_n2: aNumero(celda(fila, 'precio_n2')),
      price_per_kwh_n3: aNumero(celda(fila, 'precio_n3')),
      fixed_charge: aNumero(celda(fila, 'cargo_fijo')),
    });
  }

  /* Normalizacion de la etiqueta del escalon.
     El dominio las llama R1..R9 (es lo que muestran los chips de la tabla de
     tarifas del cliente). Un archivo puede traer la columna como "RANGO" con
     1, 2, 3 o directamente "1", "2". Si el valor es numerico se le antepone la
     R para que el chip diga R1 y no 1; si viene vacio se genera por posicion. */
  filas.forEach((f, i) => {
    const etiqueta = f.categoria.trim();
    if (etiqueta === '') f.categoria = `R${i + 1}`;
    else if (/^\d+$/.test(etiqueta)) f.categoria = `R${etiqueta}`;
  });

  const provinciaCruda = cuerpo.length ? celda(cuerpo.find((f) => f.some((c) => String(c ?? '').trim() !== '')) || [], 'provincia') : '';
  const provincia = provinciaCruda ? String(provinciaCruda).trim() : null;

  return { rows: filas, avisos, provincia };
}

/** CSV -> matriz. PapaParse corre en el hilo principal, sin worker. */
function leerCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: 'greedy',
      complete: (res) => {
        if (res.errors && res.errors.length) {
          // No se aborta: un CSV suele traer comas de mas y aun asi es usable.
          const graves = res.errors.filter((e) => e.code !== 'UndetectableDelimiter');
          if (graves.length && !res.data.length) {
            reject(new Error(`No se pudo leer el CSV: ${graves[0].message}`));
            return;
          }
        }
        resolve(res.data);
      },
      error: (err) => reject(err),
    });
  });
}

/** XLSX -> matriz de la primera hoja. */
async function leerXLSX(file) {
  const filas = await readXlsxFile(file);
  return filas;
}

/**
 * Punto de entrada: lee el archivo y devuelve filas listas para el formulario.
 *
 * @param {File} file
 * @returns {Promise<{ rows: object[], avisos: string[], provincia: string|null, nombre: string }>}
 */
export async function parseTariffFile(file) {
  if (!file) throw new Error('No se selecciono ningun archivo.');
  const esCSV = /\.csv$/i.test(file.name);
  const esXLSX = /\.(xlsx|xls)$/i.test(file.name);

  if (!esCSV && !esXLSX) {
    throw new Error(`Formato no soportado: ${file.name}. Se aceptan CSV y XLSX.`);
  }

  let matriz;
  try {
    matriz = esCSV ? await leerCSV(file) : await leerXLSX(file);
  } catch (e) {
    throw new Error(`No se pudo leer "${file.name}": ${e.message}`);
  }

  const { rows, avisos, provincia } = matrizAFilas(matriz);
  return { rows, avisos, provincia, nombre: file.name };
}

/**
 * Plantilla en CSV para bajar. Sin esto el admin tiene que adivinar que
 * columnas espera el sistema, y adivinar mal es la forma mas comun de que la
 * carga falle.
 */
export function plantillaCSV() {
  const lineas = [
    ['Escalon', 'Desde kWh', 'Hasta kWh', 'Precio N1', 'Precio N2', 'Precio N3', 'Cargo fijo', 'Provincia'],
    ['R1', '0', '150', '132.50', '', '', '0', ''],
    ['R2', '151', '300', '138.00', '', '', '0', ''],
    ['R3', '301', '500', '144.50', '', '', '0', ''],
    ['R4', '501', '', '152.00', '', '', '0', ''],
  ];
  return Papa.unparse(lineas);
}

export { normProvincia, aNumero, matrizAFilas };
