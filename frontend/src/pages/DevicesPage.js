import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Cpu } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const emptyDevice = { name: '', category_id: '', nominal_watts: '', hours_daily_usage: '' };

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [applianceGroups, setApplianceGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [form, setForm] = useState(emptyDevice);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, cRes, aRes] = await Promise.all([
        api.devices.getAll(),
        api.devices.getCategories(),
        api.appliances.getByCategory(),
      ]);
      setDevices(dRes.data.devices || dRes.data || []);
      setCategories(cRes.data.categories || cRes.data || []);
      setApplianceGroups(aRes.data.categories || aRes.data || []);
    } catch { toast.error('Error al cargar dispositivos'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditDevice(null); setForm(emptyDevice); setShowModal(true); };
  const openEdit = (d) => { setEditDevice(d); setForm({ name: d.name, category_id: d.category_id || d.category?.id || '', nominal_watts: d.nominal_watts || '', hours_daily_usage: d.hours_daily_usage || '' }); setShowModal(true); };

  const selectAppliance = (e) => {
    const appId = e.target.value;
    if (!appId) return;
    const appliance = applianceGroups
      .flatMap(g => g.appliances || [])
      .find(a => (a.id || a._id) === appId);
    if (!appliance) return;
    setForm({
      ...form,
      name: appliance.name,
      category_id: form.category_id,
      nominal_watts: appliance.nominal_watts,
      hours_daily_usage: appliance.hours_daily_usage,
    });
  };

  const selectedAppliances = form.category_id
    ? (applianceGroups.find(g => (g.id || g._id) === form.category_id)?.appliances || [])
    : [];

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editDevice) {
        await api.devices.update(editDevice.id || editDevice._id, form);
        toast.success('Dispositivo actualizado');
      } else {
        await api.devices.create(form);
        toast.success('Dispositivo creado');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este dispositivo?')) return;
    try {
      await api.devices.delete(id);
      toast.success('Dispositivo eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  const filtered = filter ? devices.filter(d => (d.category_id || d.category?.id) === filter) : devices;

  const columns = [
    { header: 'Nombre', key: 'name', render: (_, r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { header: 'Categoría', key: 'category', render: (_, r) => <span className="badge badge-primary">{r.category?.name || 'Sin categoría'}</span> },
    { header: 'Watts', key: 'nominal_watts' },
    { header: 'kWh/día', key: 'daily_kwh' },
    { header: 'Horas/día', key: 'hours_daily_usage' },
    { header: 'Acciones', key: 'actions', render: (_, r) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Edit2 size={14} /></button>
        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(r.id || r._id); }}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <h2><Cpu size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Mis Dispositivos</h2>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Agregar Dispositivo</button>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : <DataTable columns={columns} data={filtered} emptyMessage="No hay dispositivos registrados" />}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editDevice ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {!editDevice && (
                  <div className="form-group">
                    <label className="form-label">Electrodoméstico del catálogo</label>
                    <select className="form-select" value="" onChange={selectAppliance} disabled={!form.category_id}>
                      <option value="">{form.category_id ? 'Seleccionar del catálogo...' : 'Primero elegí la categoría'}</option>
                      {selectedAppliances.map(a => (
                        <option key={a.id || a._id} value={a.id || a._id}>{a.name} — {a.nominal_watts} W</option>
                      ))}
                    </select>
                    <small className="form-hint">Elegí un electrodoméstico y se completarán los datos automáticamente.</small>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value, name: editDevice ? form.name : '' })} required>
                    <option value="">Seleccionar</option>
                    {categories.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Watts</label>
                    <input className="form-input" type="number" value={form.nominal_watts} onChange={e => setForm({ ...form, nominal_watts: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Horas de uso/día</label>
                  <input className="form-input" type="number" step="0.1" value={form.hours_daily_usage} onChange={e => setForm({ ...form, hours_daily_usage: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
