import React, { useId } from 'react';

/**
 * Marca de ControlAR Energia.
 *
 * Un rayo sobre un squircle azul con tres barras ascendentes debajo: energia
 * (el rayo) mas medicion (el grafico). Las barras van en un tono atenuado, asi
 * a tamano chico (sidebar, 20px) se leen como textura y a tamano grande se leen
 * como grafico de consumo.
 *
 * El color no lleva hex: el gradiente de la baldosa y el blanco del rayo salen
 * de tokens (--logo-tile-a/b, --logo-mark, --logo-bar), asi la marca es
 * identica en los dos temas. El id del gradiente se genera con useId porque
 * puede haber varias marcas en la misma pagina y un id fijo se duplicaria.
 */
export function LogoMark({ size = 32, className = '', title = 'ControlAR Energía' }) {
  // useId devuelve algo tipo ":r1:"; los dos puntos no son validos en url(#id).
  const gid = `logo-grad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      className={`logo-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop className="logo-stop-a" offset="0%" />
          <stop className="logo-stop-b" offset="100%" />
        </linearGradient>
      </defs>

      {/* Baldosa */}
      <rect x="0" y="0" width="48" height="48" rx="14" ry="14" fill={`url(#${gid})`} />

      {/* Rayo */}
      <polygon
        className="logo-bolt"
        points="25,9 15,24 22,24 19,36 31,18 24,18"
      />

      {/* Barras ascendentes: grafico de consumo bajo el rayo. Van deliberadamente
         atenuadas y angostas para que el rayo mande en la lectura y las barras
         solo se singularicen como textura a tamano chico. */}
      <rect className="logo-bar" x="16" y="37" width="4" height="6" rx="1.4" ry="1.4" />
      <rect className="logo-bar" x="23.5" y="33" width="4" height="10" rx="1.4" ry="1.4" />
      <rect className="logo-bar" x="31" y="30" width="4" height="13" rx="1.4" ry="1.4" />
    </svg>
  );
}

/**
 * Marca + nombre. El texto hereda el color del contenedor (currentColor), para
 * que la misma marca funcione sobre azul oscuro (nav, sidebar) y sobre fondo
 * claro (login, register) sin variantes duplicadas.
 */
export default function Logo({
  size = 30,
  text = 'ControlAR',
  sub = '',
  className = '',
  markClassName = '',
}) {
  return (
    <span className={`logo ${className}`.trim()}>
      <LogoMark size={size} className={markClassName} />
      <span className="logo-word">
        {text}
        {sub ? <span className="logo-word-sub">{sub}</span> : null}
      </span>
    </span>
  );
}
