import React, { useState, useEffect } from 'react';
import { FileText, Plus, CalendarRange, Zap, DollarSign, Receipt } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import BarChart from '../components/charts/BarChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageSection from '../components/common/PageSection';
import Modal from '../components/common/Modal';
import Field from '../components/common/Field';
import toast from 'react-hot-toast';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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
      toast.success('Factura registrada correctamente');
      setShowForm(false);
      setForm({ period_month: '', period_year: '', kwh_consumed: '', amount_paid: '', tariff_applied: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear factura');
    }
    setSaving(false);
  };

  const columns = [
    { header: 'Período', key: 'period', render: (_, r) => (
      <span style={{ fontWeight: 600 }}>{months[(r.period_month || r.month) - 1] || r.period_month || r.month} {r.period_year || r.year}</span>
    ) },
    { header: 'kWh', key: 'kwh_consumed', render: (v, r) => <span className="table-mono">{(v || r.kwh) ?? '—'} kWh</span> },
    { header: 'Monto', key: 'amount_paid', render: (v, r) => <span className="table-mono"><strong>${(v || r.amount) ?? '—'}</strong></span> },
    { header: 'Tarifa', key: 'tariff_applied', render: (v) => v ? <span className="badge badge-warning">${v}/kWh</span> : <span className="badge badge-secondary">N/A</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><FileText size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Facturas de Energía</h2>
          <p className="page-header-subtitle">Cargá tus facturas y compará el costo mes a mes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nueva Factura
        </button>
      </div>

      {comparison.length > 0 && (
        <PageSection
          icon={<Receipt size={18} />}
          title="Comparación mensual"
          subtitle="Evolución del monto de tus facturas."
          style={{ marginBottom: 24 }}
        >
          <BarChart data={comparison} xKey="period" yKey="amount" title="" color="#f59e0b" />
        </PageSection>
      )}

      <PageSection
        icon={<DollarSign size={18} />}
        title="Historial de facturas"
        subtitle="Todas las facturas registradas en tu cuenta."
      >
        {loading ? <LoadingSpinner /> : <DataTable columns={columns} data={invoices} emptyMessage="No hay facturas registradas. Usá el botón «Nueva Factura»." />}
      </PageSection>

      {showForm && (
        <Modal
          title="Nueva factura"
          subtitle="Completá los datos que figuran en tu boleta"
          icon={<FileText size={18} />}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <Field label="Mes" icon={<CalendarRange size={15} />} required>
                  <select className="form-select" value={form.period_month} onChange={(e) => setForm({ ...form, period_month: e.target.value })} required>
                    <option value="">Seleccionar mes</option>
                    {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
              </div>
              <div className="form-group">
                <Field label="Año" icon={<CalendarRange size={15} />} required>
                  <input className="form-input" type="number" min="2020" max="2100" value={form.period_year} onChange={(e) => setForm({ ...form, period_year: e.target.value })} required placeholder="Ej.: 2026" />
                </Field>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <Field label="kWh consumidos" icon={<Zap size={15} />} required hint="Total de energía del período.">
                  <input className="form-input" type="number" step="0.01" min="0" value={form.kwh_consumed} onChange={(e) => setForm({ ...form, kwh_consumed: e.target.value })} required placeholder="Ej.: 180" />
                </Field>
              </div>
              <div className="form-group">
                <Field label="Monto total ($)" icon={<DollarSign size={15} />} required hint="Importe final de la boleta.">
                  <input className="form-input" type="number" step="0.01" min="0" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} required placeholder="Ej.: 15000" />
                </Field>
              </div>
            </div>
            <div className="form-group">
              <Field label="Tarifa aplicada ($/kWh)" icon={<Zap size={15} />} hint="Precio del kWh si figura en la boleta (opcional).">
                <input className="form-input" type="number" step="0.001" min="0" value={form.tariff_applied} onChange={(e) => setForm({ ...form, tariff_applied: e.target.value })} placeholder="Ej.: 82.5" />
              </Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar factura'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
