import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Guarda de rutas del panel de administracion.
 *
 * Es una barrera de navegacion, NO de seguridad: si alguien fuerza la URL a
 * mano, el backend responde 403 igual. Sirve para no mostrar una pantalla
 * vacia a un usuario sin permisos, y para mandarlo al dashboard en vez de
 * dejarlo en un panel que no puede cargar.
 *
 * Devuelve <Outlet /> y no children: en react-router v6 las rutas hijas de un
 * <Route element={...}> se montan por el Outlet, no por props.children. Con
 * children el panel de admin se abia en blanco.
 */
export default function AdminRoute() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
