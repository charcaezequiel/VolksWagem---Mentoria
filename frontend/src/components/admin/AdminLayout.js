import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, Boxes, Brain, ArrowLeft, Shield,
} from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ErrorBoundaryWithTranslation } from '../common/ErrorBoundary';

const TABS = [
  { to: '/admin', end: true, label: 'admin.tab.overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'admin.tab.users', icon: Users },
  { to: '/admin/tariffs', label: 'admin.tab.tariffs', icon: DollarSign },
  { to: '/admin/catalog', label: 'admin.tab.catalog', icon: Boxes },
  { to: '/admin/ai', label: 'admin.tab.ai', icon: Brain },
];

/**
 * Contenedor del panel de administracion.
 *
 * Usa Outlet (no props children) porque las sub-paneles son rutas hermanas
 * dentro del mismo layout en App.js, igual que el Layout principal.
 */
export default function AdminLayout() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-title">
          <span className="admin-header-mark" aria-hidden="true">
            <Shield size={20} />
          </span>
          <div>
            <h1>{t('admin.title')}</h1>
            <p>{t('admin.subtitle')}</p>
          </div>
        </div>
        {/* El panel es la CASA del administrador, asi que el boton de volver no
            tiene a donde ir: /dashboard esta del lado del cliente y
            CustomerRoute lo devolveria acá mismo, dejando un enlace que parece
            funcionar y no cambia nada. Para un admin el menu lateral ya tiene
            la salida (perfil y logout). */}
        {!isAdmin && (
          <NavLink to="/dashboard" className="admin-back">
            <ArrowLeft size={16} />
            <span>{t('admin.back')}</span>
          </NavLink>
        )}

        <button
          type="button"
          className="admin-nav-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {t('admin.tab.overview')}
        </button>
      </header>

      <nav className={`admin-nav ${open ? 'open' : ''}`}>
        {TABS.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            <span>{t(label)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-content">
        <ErrorBoundaryWithTranslation zona="admin">
          <Outlet />
        </ErrorBoundaryWithTranslation>
      </div>
    </div>
  );
}
