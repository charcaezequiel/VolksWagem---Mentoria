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
