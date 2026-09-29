import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Guarda de rutas del panel de administracion.
 *
 * Es una barrera de navegacion, NO de seguridad: si alguien fuerza la URL a
 * mano, el backend responde 403 igual. Sirve para no mostrar una pantalla
 * vacia a un usuario sin permisos, y para mandarlo al dashboard en vez de
 * dejarlo en un panel que no puede cargar.
 */
export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}
