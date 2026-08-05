import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
};

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const title = titles[location.pathname] || 'ControlAR';

  useEffect(() => {
    api.alerts.getUnreadCount().then(res => setUnreadCount(res.data.count || 0)).catch(() => {});
  }, [location.pathname]);

  return (
    <header className="main-header">
      <h1 className="header-title">{title}</h1>
      <div className="header-actions">
        <button className="header-notification" onClick={() => window.location.href = '/alerts'}>
          <Bell size={20} />
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>
        <div className="header-user">
          <div className="header-avatar">{user?.name?.charAt(0) || 'U'}</div>
          <span className="header-username">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
