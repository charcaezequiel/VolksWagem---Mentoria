import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

// Cronómetros de medición manual globales: sobreviven a la navegación (los
// timers viven en este provider y se guardan en localStorage con su startAt,
// de modo que el tiempo transcurrido sigue contando aunque cambies de página
// o recargues el navegador). También soporta varios dispositivos a la vez.

const ManualTimerContext = createContext(null);

const TIMERS_KEY = 'controlar.manual_timers';
const RESULTS_KEY = 'controlar.manual_results';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const loadList = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function ManualTimerProvider({ children }) {
  const [timers, setTimers] = useState(() => loadList(TIMERS_KEY));
  const [results, setResults] = useState(() => loadList(RESULTS_KEY));

  useEffect(() => {
    try { localStorage.setItem(TIMERS_KEY, JSON.stringify(timers)); } catch { /* noop */ }
  }, [timers]);

  useEffect(() => {
    try { localStorage.setItem(RESULTS_KEY, JSON.stringify(results)); } catch { /* noop */ }
  }, [results]);

  const startTimer = useCallback(({ device_id, device_name, watts, subsidy, times, province_id }) => {
    setTimers((prev) => [
      ...prev,
      {
        id: uid(),
        device_id,
        device_name,
        watts: Number(watts) || 0,
        subsidy: subsidy || 'N1',
        times: parseInt(times, 10) || 1,
        province_id: province_id || null,
        startAt: Date.now(),
      },
    ]);
  }, []);

  const resetTimer = useCallback((id) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeResult = useCallback((id) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearResults = useCallback(() => setResults([]), []);

  const stopTimer = useCallback(async (id) => {
    const timer = timers.find((t) => t.id === id);
    if (!timer) return null;
    // Saca el cronómetro de la lista activa de inmediato para que no se pueda
    // detener dos veces; el cálculo continúa aunque cambies de página.
    setTimers((prev) => prev.filter((t) => t.id !== id));

    const elapsed = Math.max(0, Math.floor((Date.now() - timer.startAt) / 1000));
    const hours = elapsed / 3600;
    const kwh = (timer.watts * hours) / 1000;
    const monthlyKwh = kwh * timer.times * 30;
    const result = {
      id: uid(),
      device_id: timer.device_id,
      device_name: timer.device_name,
      watts: timer.watts,
      subsidy: timer.subsidy,
      times: timer.times,
      elapsed,
      kwh: Math.round(kwh * 1000) / 1000,
      monthlyKwh: Math.round(monthlyKwh * 100) / 100,
      monthlyCost: null,
      category: null,
      recorded: false,
      finishedAt: Date.now(),
    };

    try {
      await api.consumption.addReading({
        device_id: timer.device_id,
        instant_watts: timer.watts,
        accumulated_kwh_day: result.kwh,
        source: 'manual',
      });
      result.recorded = true;
    } catch { /* still show the result even if the history save fails */ }

    if (timer.province_id) {
      try {
        const res = await api.tariffs.estimate(timer.province_id, result.monthlyKwh, timer.subsidy);
        result.monthlyCost = res.data.result?.estimated_total ?? null;
        result.category = res.data.result?.category?.category || null;
      } catch { /* the province may not have tariffs */ }
    }

    setResults((prev) => [result, ...prev].slice(0, 20));
    return result;
  }, [timers]);

  return (
    <ManualTimerContext.Provider value={{ timers, results, startTimer, stopTimer, resetTimer, removeResult, clearResults }}>
      {children}
    </ManualTimerContext.Provider>
  );
}

export const useManualTimer = () => useContext(ManualTimerContext);