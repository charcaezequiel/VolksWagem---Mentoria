import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { LanguageProvider } from './context/LanguageContext';
import { ManualTimerProvider } from './context/ManualTimerContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import CustomerRoute from './components/common/CustomerRoute';
import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import ConsumptionPage from './pages/ConsumptionPage';
import InvoicesPage from './pages/InvoicesPage';
import AlertsPage from './pages/AlertsPage';
import PredictionsPage from './pages/PredictionsPage';
import TariffsPage from './pages/TariffsPage';
import ProfilePage from './pages/ProfilePage';
import AssistantPage from './pages/AssistantPage';
import RecommendationsPage from './pages/RecommendationsPage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminTariffsPage from './pages/admin/AdminTariffsPage';
import AdminCatalogPage from './pages/admin/AdminCatalogPage';
import AdminAISettingsPage from './pages/admin/AdminAISettingsPage';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <NotificationProvider>
              <ManualTimerProvider>
                <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily: 'Inter, sans-serif' } }} />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  {/* El Layout envuelve las dos ramas para que el admin y el
                      cliente compartan barra, tema e idioma. /profile queda
                      fuera de CustomerRoute a proposito: la identidad (nombre,
                      correo, contrasena) no es dominio del cliente. */}
                  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route element={<CustomerRoute />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/devices" element={<DevicesPage />} />
                      <Route path="/devices/:id" element={<DeviceDetailPage />} />
                      <Route path="/consumption" element={<ConsumptionPage />} />
                      <Route path="/invoices" element={<InvoicesPage />} />
                      <Route path="/alerts" element={<AlertsPage />} />
                      <Route path="/predictions" element={<PredictionsPage />} />
                      <Route path="/tariffs" element={<TariffsPage />} />
                      <Route path="/assistant" element={<AssistantPage />} />
                      <Route path="/recommendations" element={<RecommendationsPage />} />
                    </Route>
                    <Route path="/profile" element={<ProfilePage />} />
                    {/* Ruta sin path: AdminRoute envuelve a /admin y sus
                        sub-paneles. La autorizacion real la hace requireAdmin
                        en el backend; esto solo evita renderizar el panel a
                        quien no puede usarlo. */}
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminOverviewPage />} />
                        <Route path="users" element={<AdminUsersPage />} />
                        <Route path="tariffs" element={<AdminTariffsPage />} />
                        <Route path="catalog" element={<AdminCatalogPage />} />
                        <Route path="ai" element={<AdminAISettingsPage />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ManualTimerProvider>
            </NotificationProvider>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
