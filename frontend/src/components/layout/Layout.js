import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ErrorBoundaryWithTranslation } from '../common/ErrorBoundary';

/* El mismo boton cumple dos roles segun el ancho de la ventana:
   - Desktop: colapsa/enaira el sidebar.
   - <=768px: el sidebar esta off-canvas (translateX(-100%)), asi que el boton
     lo abre y cierra como drawer. Antes el toggle solo cambiaba `collapsed` y
     en mobile el menu quedaba inaccesible para siempre. */
const isMobile = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    if (isMobile()) setOpen((prev) => !prev);
    else setCollapsed((prev) => !prev);
  };

  const closeDrawer = () => setOpen(false);

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} open={open} onToggle={handleToggle} onClose={closeDrawer} />
      {/* Fondo detras del drawer en mobile: tocarlo cierra el menu. En desktop
          no se muestra (display:none en el CSS). */}
      <button
        type="button"
        className={`sidebar-backdrop ${open ? 'open' : ''}`}
        aria-label="Cerrar menu"
        tabIndex={open ? 0 : -1}
        onClick={closeDrawer}
      />
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenu={handleToggle} />
        <main className="page-content">
          {/* El limite va acá y no mas arriba a proposito: si una pagina del
              cliente explota, el menu lateral y el header siguen en pie, y el
              usuario puede moverse a otra seccion en vez de quedarse con una
              pantalla en blanco. */}
          <ErrorBoundaryWithTranslation zona="cliente">
            <Outlet />
          </ErrorBoundaryWithTranslation>
        </main>
      </div>
    </div>
  );
}
