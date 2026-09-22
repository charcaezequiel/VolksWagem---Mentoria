import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw, CheckCircle2, XCircle, Sparkles, Cpu, Zap, Leaf } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from '../context/LanguageContext';

export default function RecommendationsPage() {
  const { t, lang } = useTranslation();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [provider, setProvider] = useState(null);

  const categoryMeta = {
    consumo: { label: t('recommendations.cat.consumo'), icon: Zap, className: 'rec-consumo' },
    eficiencia: { label: t('recommendations.cat.eficiencia'), icon: Leaf, className: 'rec-eficiencia' },
    mantenimiento: { label: t('recommendations.cat.mantenimiento'), icon: Cpu, className: 'rec-mantenimiento' },
    comportamiento: { label: t('recommendations.cat.comportamiento'), icon: Sparkles, className: 'rec-comportamiento' },
    general: { label: t('recommendations.cat.general'), icon: Lightbulb, className: 'rec-general' },
  };

  const priorityLabel = { high: t('recommendations.priority_high'), medium: t('recommendations.priority_medium'), low: t('recommendations.priority_low') };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.ai.getRecommendations();
      setRecommendations(res.data.recommendations || res.data || []);
    } catch {
      toast.error(t('recommendations.error_load'));
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
      toast.success(force ? t('recommendations.gen_force_success') : t('recommendations.gen_success'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('recommendations.error_gen'));
    }
    setGenerating(false);
  };

  const updateStatus = async (rec, status) => {
    try {
      await api.ai.updateRecommendation(rec.id, { status });
      setRecommendations((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status } : r)));
      toast.success(status === 'applied' ? `${t('recommendations.applied_toast')} 🎉` : status === 'dismissed' ? t('recommendations.dismissed_toast') : t('recommendations.pending_toast'));
    } catch {
      toast.error(t('recommendations.error_update'));
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
            {rec.source === 'ai' && <span className="badge badge-success">{t('recommendations.gemini_badge')}</span>}
            {rec.potential_savings_kwh != null && (
              <span className="rec-savings">💡 {t('recommendations.savings', { kwh: rec.potential_savings_kwh })}{rec.potential_savings_cost != null ? ` ($${rec.potential_savings_cost.toLocaleString(lang === 'en' ? 'en-US' : 'es-AR')})` : ''}</span>
            )}
          </div>
        </div>
        <div className="rec-actions">
          {rec.status !== 'applied' && (
            <button className="btn btn-sm btn-secondary" title={t('recommendations.apply_title')} onClick={() => updateStatus(rec, 'applied')}>
              <CheckCircle2 size={14} /> {t('recommendations.apply_btn')}
            </button>
          )}
          {rec.status === 'applied' && <span className="rec-applied"><CheckCircle2 size={16} /> {t('recommendations.applied_label')}</span>}
          {rec.status !== 'dismissed' && (
            <button className="btn btn-sm btn-secondary" title={t('recommendations.dismiss_title')} onClick={() => updateStatus(rec, 'dismissed')}>
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
          <h2><Lightbulb size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('recommendations.title')}</h2>
          <p className="page-header-subtitle">{t('recommendations.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleGenerate(true)} disabled={generating}>
          <RefreshCw size={16} className={generating ? 'spinning' : ''} />
          {generating ? t('recommendations.generating') : t('recommendations.regenerate')}
        </button>
      </div>

      {provider && (
        <div className="card ai-banner" style={{ marginBottom: 20 }}>
          <Sparkles size={18} />
          <span>
            {provider === 'gemini'
              ? t('recommendations.gemini_banner')
              : t('recommendations.local_banner')}
          </span>
        </div>
      )}

      {loading ? <LoadingSpinner /> : recommendations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Lightbulb size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{t('recommendations.empty')}</p>
          <button className="btn btn-primary" onClick={() => handleGenerate(false)} disabled={generating}>
            <Sparkles size={16} /> {t('recommendations.generate')}
          </button>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h3 className="section-title">{t('recommendations.pending')} ({pending.length})</h3>
              {pending.map(renderRec)}
            </section>
          )}
          {applied.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h3 className="section-title">{t('recommendations.applied')} ({applied.length})</h3>
              {applied.map(renderRec)}
            </section>
          )}
          {dismissed.length > 0 && (
            <section>
              <h3 className="section-title">{t('recommendations.dismissed')} ({dismissed.length})</h3>
              {dismissed.map(renderRec)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
