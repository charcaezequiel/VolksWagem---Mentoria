import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { LayoutDashboard, Cpu, Zap, FileText, Bell, Brain, DollarSign, Bot, Lightbulb, User, LogOut, Menu, X } from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
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

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">⚡ ControlAR</span>
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
