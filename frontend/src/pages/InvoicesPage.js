import React, { useState, useEffect } from 'react';
import { FileText, Plus } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import BarChart from '../components/charts/BarChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ period_month: '', period_year: '', kwh_consumed: '', amount_paid: '', tariff_applied: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [iRes, cRes] = await Promise.all([api.invoices.getAll(), api.invoices.getComparison()]);
      setInvoices(iRes.data.invoices || iRes.data || []);
      setComparison(cRes.data.data || cRes.data || []);
    } catch { toast.error('Error al cargar facturas'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.invoices.create(form);
      toast.success('Factura registrada');
      setShowForm(false);
      setForm({ period_month: '', period_year: '', kwh_consumed: '', amount_paid: '', tariff_applied: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear factura');
    }
    setSaving(false);
  };

  const columns = [
    { header: 'Período', key: 'period', render: (_, r) => `${r.period_month || r.month}/${r.period_year || r.year}` },
    { header: 'kWh', key: 'kwh_consumed', render: (v, r) => v || r.kwh },
    { header: 'Monto', key: 'amount_paid', render: (v, r) => `$${v || r.amount}` },
    { header: 'Tarifa', key: 'tariff_applied', render: (v) => v ? `$${v}/kWh` : 'N/A' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2><FileText size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Facturas</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Nueva Factura</button>
      </div>

      {loading ? <LoadingSpinner /> : <DataTable columns={columns} data={invoices} emptyMessage="No hay facturas registradas" />}

      {comparison.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <BarChart data={comparison} xKey="period" yKey="amount" title="Comparación Mensual de Facturas" color="#f59e0b" />
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Factura</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mes</label>
                    <select className="form-select" value={form.period_month} onChange={e => setForm({ ...form, period_month: e.target.value })} required>
                      <option value="">Seleccionar</option>
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Año</label>
                    <input className="form-input" type="number" value={form.period_year} onChange={e => setForm({ ...form, period_year: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">kWh consumidos</label>
                    <input className="form-input" type="number" step="0.01" value={form.kwh_consumed} onChange={e => setForm({ ...form, kwh_consumed: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto ($)</label>
                    <input className="form-input" type="number" step="0.01" value={form.amount_paid} onChange={e => setForm({ ...form, amount_paid: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tarifa ($/kWh)</label>
                  <input className="form-input" type="number" step="0.001" value={form.tariff_applied} onChange={e => setForm({ ...form, tariff_applied: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
