import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

// Recharts escribe el color como atributo SVG, donde var(--x) no funciona,
// así que hay que resolver el token a un valor real desde el CSS.
const NAMES = [1, 2, 3, 4, 5, 6, 7, 8];

function read(name) {
  if (typeof window === 'undefined') return '#1d4ed8';
  return getComputedStyle(document.documentElement).getPropertyValue(`--chart-${name}`).trim();
}

/**
 * Paleta categórica para Recharts. Se recalcula al cambiar de tema porque
 * los tokens --chart-* tienen valores distintos en claro y en oscuro.
 * El orden está elegido para separar luminancia, no solo matiz: así las
 * series siguen distinguiéndose con daltonismo.
 */
export default function useChartPalette() {
  const { dark } = useTheme();
  const [colors, setColors] = useState(() => NAMES.map(read));

  useEffect(() => {
    // requestAnimationFrame: el toggle de tema ya aplicó la clase al DOM.
    const id = requestAnimationFrame(() => setColors(NAMES.map(read)));
    return () => cancelAnimationFrame(id);
  }, [dark]);

  return colors;
}

/** Color suelto para un gráfico de una sola serie. */
export function useChartColor(index = 1) {
  const palette = useChartPalette();
  return palette[(index - 1) % palette.length];
}

/**
 * Orden de slices para el donut. En un círculo los vecinos se tocan, así que el
 * orden de los datos no sirve: hay que intercalar para que cada par vecino se
 * separe en luminancia (y no solo en matiz, por daltonismo e impresión).
 * 1 esmeralda, 5 rojo, 3 ambar, 7 magenta, 6 cian, 4 violeta, 8 oliva, 2 indigo.
 * Con este orden el par vecino mas bajo queda en 1.52:1 de luminancia; el orden
 * natural de los datos dejaba dos pares por debajo de 1.3 (magenta-indigo y
 * cian-oliva), que se fundian al ver el grafico en escala de grises.
 */
const PIE_ORDER = [1, 5, 3, 7, 6, 4, 8, 2];

export function usePiePalette() {
  const palette = useChartPalette();
  return PIE_ORDER.map((n) => palette[n - 1]);
}
