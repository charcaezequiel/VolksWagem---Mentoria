import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ErrorBoundaryWithTranslation } from '../common/ErrorBoundary';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
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
