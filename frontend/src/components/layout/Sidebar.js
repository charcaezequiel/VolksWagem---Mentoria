import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Cpu, Zap, FileText, Bell, Brain, DollarSign, LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/devices', label: 'Dispositivos', icon: Cpu },
  { to: '/consumption', label: 'Consumo', icon: Zap },
  { to: '/invoices', label: 'Facturas', icon: FileText },
  { to: '/alerts', label: 'Alertas', icon: Bell },
  { to: '/predictions', label: 'Predicciones', icon: Brain },
  { to: '/tariffs', label: 'Tarifas', icon: DollarSign },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">⚡ ControlAR</span>
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
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
        <button className="sidebar-logout" onClick={logout} title="Cerrar sesión">
          <LogOut size={20} />
          {!collapsed && <span>Salir</span>}
        </button>
      </div>
    </aside>
  );
}
