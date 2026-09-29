import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Guarda de las rutas del lado del cliente.
 *
 * Es la contraparte de AdminRoute: si el panel se abre solo para admins, estas
 * paginas (consumo, facturas, alertas, predicciones, dispositivos) son de un
 * cliente y no tienen sentido para quien administra el sistema. Un admin tiene
 * un dashboard vacio con cero dispositivos y cero lecturas, y las calculators
 * de factura que no corresponden a nadie.
 *
 * /profile NO pasa por aca: cambiar el nombre, el correo y la contrasena es
 * identidad, no dominio del cliente, asi que el admin la puede usar igual. Lo
 * que se esconde es la parte de provincia, rubro y umbral, dentro de la pagina.
 *
 * Como AdminRoute, esto es navegacion y no seguridad: el backend decide.
 */
export default function CustomerRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  return children;
}
