import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import LineChart from '../components/charts/LineChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, aRes, anRes] = await Promise.all([
        api.predictions.getAll(),
        api.predictions.getAccuracy().catch(() => ({ data: null })),
        api.predictions.detectAnomalies().catch(() => ({ data: { anomalies: [] } })),
      ]);
      setPredictions(pRes.data.predictions || pRes.data || []);
      setAccuracy(aRes.data);
      setAnomalies(anRes.data.anomalies || anRes.data || []);
    } catch { toast.error('Error al cargar predicciones'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.predictions.generate({});
      toast.success('Predicciones generadas');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar predicciones');
    }
    setGenerating(false);
  };

  const chartData = predictions.map(p => ({
    date: p.prediction_date || p.date,
    consumption: parseFloat(p.predicted_kwh) || 0,
  }));

  return (
    <div>
      <div className="page-header">
        <h2><Brain size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Predicciones IA</h2>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          <RefreshCw size={16} className={generating ? 'spinning' : ''} />
          {generating ? 'Generando...' : 'Generar Predicción'}
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {accuracy && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 className="chart-title">Precisión del Modelo</h3>
              <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{accuracy.mape ? `${(100 - accuracy.mape).toFixed(1)}%` : accuracy.accuracy ? `${accuracy.accuracy}%` : 'N/A'}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Precisión</div>
                </div>
                {accuracy.mape !== undefined && (
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{accuracy.mape.toFixed(2)}%</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Error (MAPE)</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {chartData.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <LineChart data={chartData} xKey="date" yKey="consumption" color="#8b5cf6" title="Pronóstico 7 días" />
            </div>
          )}

          {anomalies.length > 0 && (
            <div className="card">
              <h3 className="chart-title"><AlertTriangle size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--warning)' }} />Anomalías Detectadas</h3>
              {anomalies.map((a, i) => (
                <div key={i} className="alert-item unread">
                  <div className="alert-dot warning"></div>
                  <div className="alert-content">
                    <div className="alert-title">{a.description || a.message || 'Anomalía detectada'}</div>
                    <div className="alert-message">Valor: {a.value || a.kwh || 'N/A'} — Esperado: {a.expected || 'N/A'}</div>
                    <div className="alert-time">{a.date || a.timestamp ? new Date(a.date || a.timestamp).toLocaleDateString('es-AR') : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {predictions.length === 0 && !loading && (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <Brain size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No hay predicciones disponibles</p>
              <button className="btn btn-primary" onClick={handleGenerate}>Generar primera predicción</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
