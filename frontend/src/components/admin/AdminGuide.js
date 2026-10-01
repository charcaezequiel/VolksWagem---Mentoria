import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

/**
 * Guia de rol: le dice al admin QUE tiene que hacer, no solo donde hacer clic.
 *
 * Antes el panel era navegable pero opaco: cinco pestanas con nombres cortos y
 * ningun texto que explicara el rol. Este panel resuelve las dos dudas tipicas
 * de quien entra por primera vez ("que miro primero" y "que hago aca").
 *
 * Se guarda abierto/cerrado en localStorage porque es orientativo: si el admin
 * ya lo leyo no deberia cerrarlo en cada recarga. La clave esta versionada para
 * poder cambiar el contenido sin arrastrar la eleccion anterior.
 */
const GUIA_KEY = 'ce.admin-guide.v1';

/* El numero va en la tarjeta y no dentro del texto de "titulo" porque el orden
   de las cinco areas ES el flujo de trabajo: si va en la traduccion, el circulo
   y el texto se desalinean apenas se reordene algo aca. */
const TARJETAS = [
  {
    to: '/admin', end: true,
    titulo: 'admin.guia.resumen.t',
    tareas: ['admin.guia.resumen.t1', 'admin.guia.resumen.t2'],
  },
  {
    to: '/admin/users',
    titulo: 'admin.guia.cuentas.t',
    tareas: ['admin.guia.cuentas.t1', 'admin.guia.cuentas.t2', 'admin.guia.cuentas.t3'],
  },
  {
    to: '/admin/tariffs',
    titulo: 'admin.guia.tarifas.t',
    tareas: ['admin.guia.tarifas.t1', 'admin.guia.tarifas.t2'],
  },
  {
    to: '/admin/catalog',
    titulo: 'admin.guia.catalogo.t',
    tareas: ['admin.guia.catalogo.t1', 'admin.guia.catalogo.t2'],
  },
  {
    to: '/admin/ai',
    titulo: 'admin.guia.ia.t',
    tareas: ['admin.guia.ia.t1', 'admin.guia.ia.t2'],
  },
];

export default function AdminGuide() {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(() => {
    try {
      return localStorage.getItem(GUIA_KEY) !== 'cerrada';
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const nuevo = !abierto;
    setAbierto(nuevo);
    try {
      localStorage.setItem(GUIA_KEY, nuevo ? 'abierta' : 'cerrada');
    } catch {
      /* storage bloqueado o modo privado: no es motivo para romper el panel */
    }
  };

  if (!abierto) {
    return (
      <button type="button" className="admin-guide-reopen" onClick={toggle}>
        <HelpCircle size={16} />
        <span>{t('admin.guia.reabrir')}</span>
      </button>
    );
  }

  return (
    <section className="admin-guide">
      <header className="admin-guide-head">
        <div className="admin-guide-title">
          <span className="admin-guide-icon" aria-hidden="true">
            <HelpCircle size={18} />
          </span>
          <div>
            <h2>{t('admin.guia.titulo')}</h2>
            <p>{t('admin.guia.subtitulo')}</p>
          </div>
        </div>
        <button type="button" className="admin-guide-collapse" onClick={toggle}>
          <ChevronDown size={16} />
          <span>{t('admin.guia.cerrar')}</span>
        </button>
      </header>

      <div className="admin-guide-grid">
        {TARJETAS.map((tarjeta, i) => (
          <NavLink key={tarjeta.to} to={tarjeta.to} end={tarjeta.end} className="admin-guide-card">
            <h3>
              <span className="admin-guide-num" aria-hidden="true">{i + 1}</span>
              {t(tarjeta.titulo)}
            </h3>
            <ul>
              {tarjeta.tareas.map((tarea) => (
                <li key={tarea}>{t(tarea)}</li>
              ))}
            </ul>
            <span className="admin-guide-go">{t('admin.guia.ir')}</span>
          </NavLink>
        ))}
      </div>

      <footer className="admin-guide-foot">
        <strong>{t('admin.guia.regla')}</strong>
        <span>{t('admin.guia.regla_txt')}</span>
      </footer>
    </section>
  );
}