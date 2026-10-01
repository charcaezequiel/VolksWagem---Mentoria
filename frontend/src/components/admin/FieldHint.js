import React from 'react';

/**
 * Ayuda de un campo del panel: dice que quiere decir el dato, en palabras, y que
 * rango tiene sentido.
 *
 * El problema que resuelve: los formularios de admin estaban llenos de nombres
 * de dominio (price_per_kwh_n2, anomaly_sigma, top_p) sin ninguna pista de que
 * se espera. Un admin nuevo no sabe si "Sigma de anomalia" va en 1 o en 0,01, y
 * no tiene forma de averiguarlo salvo romper algo.
 *
 * Se usa dentro del <label>, despues del input. Envuelve solo texto, no el
 * input: si envolviera el input habria que cambiar la regla flex del label y
 * riskear el layout de todos los formularios.
 *
 *   hint      texto corto, en tono suave.
 *   ejemplo   valor de ejemplo ("ej: 0,45"), util para rangos raros.
 *   avanzado  texto del tag para marcar lo que casi nunca hay que tocar.
 */
export default function FieldHint({ hint, ejemplo, avanzado }) {
  if (!hint && !ejemplo && !avanzado) return null;

  return (
    <span className="field-hint">
      {avanzado && <span className="field-hint-tag">{avanzado}</span>}
      {hint && <span className="field-hint-desc">{hint}</span>}
      {ejemplo && <span className="field-hint-ej">{ejemplo}</span>}
    </span>
  );
}