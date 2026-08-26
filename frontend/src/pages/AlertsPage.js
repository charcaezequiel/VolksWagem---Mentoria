import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageSection from '../components/common/PageSection';
import toast from 'react-hot-toast';
import { useTranslation } from '../context/LanguageContext';

export default function AlertsPage() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: '', unread_only: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.severity) params.severity = filter.severity;
      if (filter.unread_only === 'true') params.unread_only = true;
      const res = await api.alerts.getAll(params);
      setAlerts(res.data.alerts || res.data || []);
    } catch { toast.error(t('alerts.error')); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const markRead = async (id) => {
    try {
      await api.alerts.markAsRead(id);
      setAlerts(prev => prev.map(a => (a.id || a._id) === id ? { ...a, is_read: true } : a));
      toast.success(t('alerts.mark_read_success'));
    } catch { toast.error('Error'); }
  };

  const markAll = async () => {
    try {
      await api.alerts.markAllAsRead();
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      toast.success(t('alerts.mark_all_success'));
    } catch { toast.error('Error'); }
  };

  const removeAlert = async (id) => {
    try {
      await api.alerts.delete(id);
      setAlerts(prev => prev.filter(a => (a.id || a._id) !== id));
      toast.success(t('alerts.delete_success'));
    } catch { toast.error('Error'); }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><Bell size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('alerts.title')} {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{unreadCount}</span>}</h2>
          <p className="page-header-subtitle">{t('alerts.subtitle')}</p>
        </div>
        <button className="btn btn-secondary" onClick={markAll} disabled={unreadCount === 0}><CheckCheck size={16} /> {t('alerts.mark_all')}</button>
      </div>

      <PageSection
        icon={<Filter size={18} />}
        title={t('alerts.center_title')}
        subtitle={t('alerts.center_subtitle')}
        actions={
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <select className="form-select form-select-sm" value={filter.severity} onChange={e => setFilter({ ...filter, severity: e.target.value })}>
              <option value="">{t('alerts.filter_all_severity')}</option>
              <option value="info">Info</option>
              <option value="warning">{t('alerts.filter_warning')}</option>
              <option value="critical">{t('alerts.filter_critical')}</option>
            </select>
            <select className="form-select form-select-sm" value={filter.unread_only} onChange={e => setFilter({ ...filter, unread_only: e.target.value })}>
              <option value="">{t('alerts.filter_all')}</option>
              <option value="true">{t('alerts.filter_unread')}</option>
            </select>
          </div>
        }
      >
        {loading ? <LoadingSpinner /> : alerts.length === 0 ? (
          <div className="empty-state">
            <Bell size={40} />
            <p>{t('alerts.empty')}</p>
          </div>
        ) : (
          alerts.map(a => (
            <div key={a.id || a._id} className={`alert-item ${a.is_read ? 'read' : 'unread'}`}>
              <div className={`alert-dot ${a.severity || 'info'}`}></div>
              <div className="alert-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-message">{a.message}</div>
                    <div className="alert-time">{new Date(a.created_at || a.createdAt).toLocaleString('es-AR')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!a.is_read && <button className="btn btn-sm btn-secondary" onClick={() => markRead(a.id || a._id)}>{t('alerts.mark_read')}</button>}
                    <button className="btn btn-sm btn-danger" onClick={() => removeAlert(a.id || a._id)}>×</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </PageSection>
    </div>
  );
}
