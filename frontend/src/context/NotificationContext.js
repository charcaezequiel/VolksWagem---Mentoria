import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { api } from '../services/api';

const NotificationContext = createContext(null);

// Contador global de notificaciones no leidas: una unica fuente de verdad
// compartida por el Header (campana) y el Sidebar (badge de Alertas), para que
// siempre muestren el mismo numero. Se actualiza al cargar, con cada alerta
// nueva por socket y tras marcar como leidas.
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { on } = useSocket();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    api.alerts.getUnreadCount()
      .then((res) => setUnread(res.data.count || 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, user]);

  useEffect(() => {
    const off = on('alert:new', () => refresh());
    return off;
  }, [on, refresh]);

  return (
    <NotificationContext.Provider value={{ unread, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
