import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

const getSocketUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) return process.env.REACT_APP_SOCKET_URL;
  const proto = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${proto}://${window.location.hostname}:3001`;
};

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const handlersRef = useRef({});
  const [connected, setConnected] = useState(false);

  const on = useCallback((event, handler) => {
    if (!handlersRef.current[event]) handlersRef.current[event] = [];
    handlersRef.current[event].push(handler);
    return () => {
      handlersRef.current[event] = (handlersRef.current[event] || []).filter((h) => h !== handler);
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current) socketRef.current.emit(event, data);
  }, []);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-user', user.id);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', () => {
      // Socket no disponible (p.ej. backend apagado) — no bloquear la app
    });

    socket.on('alert:new', ({ alert }) => {
      toast(alert.title || 'Nueva alerta', {
        icon: alert.severity === 'critical' ? '🚨' : '⚠️',
        duration: 6000,
      });
      Object.values(handlersRef.current).forEach((arr) => arr.forEach((h) => h('alert:new', alert)));
    });

    socket.on('reading:new', (payload) => {
      Object.values(handlersRef.current).forEach((arr) => arr.forEach((h) => h('reading:new', payload)));
    });

    socket.on('recommendation:new', (payload) => {
      Object.values(handlersRef.current).forEach((arr) => arr.forEach((h) => h('recommendation:new', payload)));
    });

    socket.on('connect_error', () => {
      // Socket no disponible (p.ej. backend apagado) — no bloquear la app
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ connected, on, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
