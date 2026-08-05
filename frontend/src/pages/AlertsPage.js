import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AlertsPage() {
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
    } catch { toast.error('Error al cargar alertas'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const markRead = async (id) => {
    try {
      await api.alerts.markAsRead(id);
      setAlerts(prev => prev.map(a => (a.id || a._id) === id ? { ...a, is_read: true } : a));
      toast.success('Alerta marcada como leída');
    } catch { toast.error('Error'); }
  };

  const markAll = async () => {
    try {
      await api.alerts.markAllAsRead();
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      toast.success('Todas las alertas marcadas como leídas');
    } catch { toast.error('Error'); }
  };

  const removeAlert = async (id) => {
    try {
      await api.alerts.delete(id);
      setAlerts(prev => prev.filter(a => (a.id || a._id) !== id));
      toast.success('Alerta eliminada');
    } catch { toast.error('Error'); }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div>
      <div className="page-header">
        <h2><Bell size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Alertas {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{unreadCount}</span>}</h2>
        <button className="btn btn-secondary" onClick={markAll} disabled={unreadCount === 0}><CheckCheck size={16} /> Marcar todas como leídas</button>
      </div>

      <div className="filter-bar">
        <Filter size={16} />
        <select className="form-select" value={filter.severity} onChange={e => setFilter({ ...filter, severity: e.target.value })}>
          <option value="">Todas las severidades</option>
          <option value="info">Info</option>
          <option value="warning">Advertencia</option>
          <option value="critical">Crítica</option>
        </select>
        <select className="form-select" value={filter.unread_only} onChange={e => setFilter({ ...filter, unread_only: e.target.value })}>
          <option value="">Todas</option>
          <option value="true">Sin leer</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)' }}>No hay alertas</p>
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
                  {!a.is_read && <button className="btn btn-sm btn-secondary" onClick={() => markRead(a.id || a._id)}>Leer</button>}
                  <button className="btn btn-sm btn-danger" onClick={() => removeAlert(a.id || a._id)}>×</button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
