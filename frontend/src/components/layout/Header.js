import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';

const titles = {
  '/dashboard': 'Dashboard',
  '/devices': 'Dispositivos',
  '/consumption': 'Consumo',
  '/invoices': 'Facturas',
  '/alerts': 'Alertas',
  '/predictions': 'Predicciones',
  '/tariffs': 'Tarifas',
  '/profile': 'Perfil',
  '/assistant': 'Asistente IA',
  '/recommendations': 'Recomendaciones',
};

export default function Header() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const { connected, on } = useSocket();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const title = titles[location.pathname] || 'ControlAR';

  const loadUnread = () => {
    api.alerts.getUnreadCount().then((res) => setUnreadCount(res.data.count || 0)).catch(() => {});
  };

  useEffect(() => {
    loadUnread();
  }, [location.pathname]);

  useEffect(() => {
    const off = on('alert:new', () => loadUnread());
    return off;
  }, [on]);

  return (
    <header className="main-header">
      <h1 className="header-title">{title}</h1>
      <div className="header-actions">
        {connected && (
          <span className="header-realtime" title="Conexión en tiempo real activa">
            <Wifi size={14} />
          </span>
        )}
        <button className="header-theme" onClick={toggle} title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <Link to="/alerts" className="header-notification">
          <Bell size={20} />
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </Link>
        <div className="header-user">
          <div className="header-avatar">{user?.name?.charAt(0) || 'U'}</div>
          <span className="header-username">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
