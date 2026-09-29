import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { LayoutDashboard, Cpu, Zap, FileText, Bell, Brain, DollarSign, Bot, Lightbulb, User, LogOut, Menu, X, Shield } from 'lucide-react';
import Logo from '../common/Logo';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useTranslation();
  const { unread } = useNotifications();

  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/devices', label: t('nav.devices'), icon: Cpu },
    { to: '/consumption', label: t('nav.consumption'), icon: Zap },
    { to: '/invoices', label: t('nav.invoices'), icon: FileText },
    { to: '/alerts', label: t('nav.alerts'), icon: Bell },
    { to: '/predictions', label: t('nav.predictions'), icon: Brain },
    { to: '/tariffs', label: t('nav.tariffs'), icon: DollarSign },
  ];

  const aiItems = [
    { to: '/assistant', label: t('nav.assistant'), icon: Bot, highlight: true },
    { to: '/recommendations', label: t('nav.recommendations'), icon: Lightbulb },
  ];

  /* Un admin no es un cliente: no tiene hogar, ni dispositivos, ni consumo, ni
     facturas. Mostrarle ese menu lo lleva a paginas que CustomerRoute le
     devuelve a /admin, asi que los enlaces serian trampas. El admin ve solo
     su panel; el perfil queda para los dos porque la identidad no es dominio
     del cliente. */
  if (isAdmin) {
    return (
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">
            <Logo size={30} markClassName="sidebar-logo-mark" />
          </span>
          <button className="sidebar-toggle" onClick={onToggle}>
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} sidebar-admin`}
          >
            <Shield size={20} />
            {!collapsed && <span>{t('nav.admin')}</span>}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <User size={20} />
            {!collapsed && <span>{t('nav.profile')}</span>}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{user?.name?.charAt(0) || 'A'}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.name}</span>
                <span className="sidebar-user-email">{t('nav.admin')}</span>
              </div>
            </div>
          )}
          <button className="sidebar-logout" onClick={logout} title={t('nav.logout_title')}>
            <LogOut size={20} />
            {!collapsed && <span>{t('nav.logout')}</span>}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">
          <Logo size={30} markClassName="sidebar-logo-mark" />
        </span>
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon }) => {
          const showBadge = to === '/alerts' && unread > 0;
          return (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon-wrap">
                <Icon size={20} />
                {showBadge && <span className="sidebar-badge" title={t('nav.alerts')}>{unread > 99 ? '99+' : unread}</span>}
              </span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}

        {!collapsed && <div className="sidebar-section-label">{t('nav.ai_section')}</div>}
        {aiItems.map(({ to, label, icon: Icon, highlight }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${highlight ? 'sidebar-ai' : ''}`}
          >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* El enlace al panel ya no vive en esta rama: un admin nunca la
            alcanza, porque arriba se devuelve su propia version del sidebar.
            Si se dejara, seria un bloque que solo se activaria en el caso que
            ya esta resuelto arriba. */}

        <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <User size={20} />
          {!collapsed && <span>{t('nav.profile')}</span>}
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.name?.charAt(0) || 'U'}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
        )}
        <button className="sidebar-logout" onClick={logout} title={t('nav.logout_title')}>
          <LogOut size={20} />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
