import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import translations from '../i18n/translations';

const AuthContext = createContext(null);

const tr = (key) => {
  const lang = localStorage.getItem('lang') || 'es';
  return translations[lang]?.[key] || translations.es?.[key] || key;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.auth.getProfile();
      setUser(res.data.user || res.data);
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, fetchProfile]);

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    return userData;
  };

  const register = async (name, email, password, provinceId) => {
    const res = await api.auth.register({ name, email, password, province_id: provinceId });
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    toast.success(tr('auth.logout_success'));
  };

  const updateProfile = async (data) => {
    const res = await api.auth.updateProfile(data);
    setUser(res.data.user || res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
