import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from '../i18n/translations';
import { localized } from '../i18n/catalog';

const LanguageContext = createContext(null);

// Convierte una alerta de BD (title/message en inglés + alert_type + metadata)
// al idioma activo usando las claves de traducción.
const fmt = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export function alertText(t, a) {
  if (!a) return { title: '', message: '' };
  const type = a.alert_type || a.type;
  if (type === 'threshold_exceeded') {
    const m = a.metadata || {};
    return {
      title: t('alerts.type.threshold_exceeded.title'),
      message: t('alerts.type.threshold_exceeded.message', {
        kwh: fmt(m.current_kwh ?? a.current_kwh),
        threshold: fmt(m.threshold_kwh ?? a.threshold_kwh),
      }),
    };
  }
  if (type === 'peak_consumption') {
    const m = a.metadata || {};
    return {
      title: t('alerts.type.peak_consumption.title'),
      message: t('alerts.type.peak_consumption.message', {
        kwh: fmt(m.recent_kwh ?? a.recent_kwh),
        avg: fmt(m.avg_daily_kwh ?? a.avg_daily_kwh),
      }),
    };
  }
  // Fallback: usar lo que trae la BD (o devolver crudo)
  return { title: a.title || '', message: a.message || '' };
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'es');

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'es' ? 'en' : 'es');
  }, [lang, setLang]);

  const t = useCallback((key, params) => {
    let text = translations[lang]?.[key] || translations['es']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return text;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, localized: (esName) => localized(lang, esName) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
