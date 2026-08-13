import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw, CheckCircle2, XCircle, Sparkles, Cpu, Zap, Leaf } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const categoryMeta = {
  consumo: { label: 'Consumo', icon: Zap, className: 'rec-consumo' },
  eficiencia: { label: 'Eficiencia', icon: Leaf, className: 'rec-eficiencia' },
  mantenimiento: { label: 'Mantenimiento', icon: Cpu, className: 'rec-mantenimiento' },
  comportamiento: { label: 'Comportamiento', icon: Sparkles, className: 'rec-comportamiento' },
  general: { label: 'General', icon: Lightbulb, className: 'rec-general' },
};

const priorityLabel = { high: 'Alta', medium: 'Media', low: 'Baja' };

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [provider, setProvider] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.ai.getRecommendations();
      setRecommendations(res.data.recommendations || res.data || []);
    } catch {
      toast.error('Error al cargar recomendaciones');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async (force) => {
    setGenerating(true);
    try {
      const res = await api.ai.generateRecommendations(force);
      setRecommendations(res.data.recommendations || []);
      setProvider(res.data.provider);
      toast.success(force ? 'Recomendaciones regeneradas' : 'Recomendaciones generadas');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar recomendaciones');
    }
    setGenerating(false);
  };

  const updateStatus = async (rec, status) => {
    try {
      await api.ai.updateRecommendation(rec.id, { status });
      setRecommendations((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status } : r)));
      toast.success(status === 'applied' ? 'Recomendación aplicada 🎉' : status === 'dismissed' ? 'Recomendación descartada' : 'Recomendación pendiente');
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const pending = recommendations.filter((r) => r.status === 'pending');
  const applied = recommendations.filter((r) => r.status === 'applied');
  const dismissed = recommendations.filter((r) => r.status === 'dismissed');

  const renderRec = (rec) => {
    const meta = categoryMeta[rec.category] || categoryMeta.general;
    const Icon = meta.icon;
    return (
      <div key={rec.id} className={`rec-card ${meta.className} ${rec.status === 'dismissed' ? 'rec-dismissed' : ''}`}>
        <div className="rec-icon"><Icon size={20} /></div>
        <div className="rec-content">
          <div className="rec-title-row">
            <h3>{rec.title}</h3>
            <span className={`badge badge-${rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'info'}`}>
              {priorityLabel[rec.priority] || rec.priority}
            </span>
          </div>
          <p className="rec-description">{rec.description}</p>
          <div className="rec-meta">
            <span className="badge badge-primary">{meta.label}</span>
            {rec.source === 'ai' && <span className="badge badge-success">IA Gemini</span>}
            {rec.potential_savings_kwh != null && (
              <span className="rec-savings">💡 Ahorro estimado: {rec.potential_savings_kwh} kWh ({rec.potential_savings_cost != null ? `$${rec.potential_savings_cost.toLocaleString('es-AR')}` : '—'})</span>
            )}
          </div>
        </div>
        <div className="rec-actions">
          {rec.status !== 'applied' && (
            <button className="btn btn-sm btn-secondary" title="Marcar como aplicada" onClick={() => updateStatus(rec, 'applied')}>
              <CheckCircle2 size={14} /> Aplicada
            </button>
          )}
          {rec.status === 'applied' && <span className="rec-applied"><CheckCircle2 size={16} /> Aplicada</span>}
          {rec.status !== 'dismissed' && (
            <button className="btn btn-sm btn-secondary" title="Descartar" onClick={() => updateStatus(rec, 'dismissed')}>
              <XCircle size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><Lightbulb size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Recomendaciones</h2>
          <p className="page-header-subtitle">Sugerencias personalizadas para reducir tu consumo y ahorrar dinero.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleGenerate(true)} disabled={generating}>
          <RefreshCw size={16} className={generating ? 'spinning' : ''} />
          {generating ? 'Generando...' : 'Regenerar con IA'}
        </button>
      </div>

      {provider && (
        <div className="card ai-banner" style={{ marginBottom: 20 }}>
          <Sparkles size={18} />
          <span>
            {provider === 'gemini'
              ? 'Recomendaciones generadas por Google Gemini a partir de tus datos reales de consumo.'
              : 'Recomendaciones basadas en heurísticas locales. Configurá tu API key de Gemini en backend/.env para recomendaciones con IA.'}
          </span>
        </div>
      )}

      {loading ? <LoadingSpinner /> : recommendations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Lightbulb size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Todavía no hay recomendaciones generadas.</p>
          <button className="btn btn-primary" onClick={() => handleGenerate(false)} disabled={generating}>
            <Sparkles size={16} /> Generar recomendaciones
          </button>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h3 className="section-title">Pendientes ({pending.length})</h3>
              {pending.map(renderRec)}
            </section>
          )}
          {applied.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h3 className="section-title">Aplicadas ({applied.length})</h3>
              {applied.map(renderRec)}
            </section>
          )}
          {dismissed.length > 0 && (
            <section>
              <h3 className="section-title">Descartadas ({dismissed.length})</h3>
              {dismissed.map(renderRec)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
