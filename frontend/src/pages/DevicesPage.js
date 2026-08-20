import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Cpu, Wifi, WifiOff, Layers, Wrench, Zap } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageSection from '../components/common/PageSection';
import DeviceFormModal from '../components/devices/DeviceFormModal';
import toast from 'react-hot-toast';

export default function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [applianceGroups, setApplianceGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
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

  const openCreate = () => { setEditDevice(null); setShowForm(true); };
  const openEdit = (d) => { setEditDevice(d); setShowForm(true); };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editDevice) {
        await api.devices.update(editDevice.id || editDevice._id, data);
        toast.success('Dispositivo actualizado');
      } else {
        await api.devices.create(data);
        toast.success('Dispositivo registrado correctamente');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar "${name || 'este dispositivo'}"?`)) return;
    try {
      await api.devices.delete(id);
      toast.success('Dispositivo eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  const filtered = filter ? devices.filter((d) => (d.category_id || d.category?.id) === filter) : devices;

  const sensorsOnline = devices.filter((d) => d.device_token && d.last_seen_at && (Date.now() - new Date(d.last_seen_at).getTime()) < 10 * 60 * 1000).length;
  const sensorsOffline = devices.filter((d) => d.device_token && (!d.last_seen_at || (Date.now() - new Date(d.last_seen_at).getTime()) >= 10 * 60 * 1000)).length;

  const columns = [
    { header: 'Nombre', key: 'name', render: (_, r) => (
      <span className="table-name" style={{ fontWeight: 600 }}>{r.name}</span>
    ) },
    { header: 'Categoría', key: 'category', render: (_, r) => (
      <span className="badge badge-primary"><Layers size={12} style={{ marginRight: 4 }} />{r.category?.name || 'Sin categoría'}</span>
    ) },
    { header: 'Watts', key: 'nominal_watts', render: (v) => <span className="table-mono">{v ?? '—'}</span> },
    { header: 'kWh/día', key: 'daily_kwh', render: (v) => <span className="table-mono">{v ?? '—'}</span> },
    { header: 'Horas/día', key: 'hours_daily_usage', render: (v) => <span className="table-mono">{v ?? '—'}</span> },
    { header: 'Sensor', key: 'sensor', render: (_, r) => {
      if (!r.device_token) return <span className="badge badge-warning"><WifiOff size={12} style={{ marginRight: 4 }} />Sin sensor</span>;
      const isRecent = r.last_seen_at && (Date.now() - new Date(r.last_seen_at).getTime()) < 10 * 60 * 1000;
      return isRecent
        ? <span className="badge badge-success"><Wifi size={12} style={{ marginRight: 4 }} />En linea</span>
        : <span className="badge badge-danger"><WifiOff size={12} style={{ marginRight: 4 }} />Sin conexion</span>;
    } },
    { header: 'Acciones', key: 'actions', render: (_, r) => (
      <div className="table-actions">
        <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); navigate(`/devices/${r.id}`); }}>
          Ver
        </button>
        <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
          <Edit2 size={14} />
        </button>
        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(r.id || r._id, r.name); }}>
          <Trash2 size={14} />
        </button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><Cpu size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Mis Dispositivos</h2>
          <p className="page-header-subtitle">Administrá los electrodomésticos de tu hogar y conectá tus sensores IoT.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Registrar electrodoméstico
        </button>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card stat-card-primary">
          <div className="stat-card-icon"><Cpu size={22} /></div>
          <div className="stat-card-content">
            <h3 className="stat-card-value">{devices.length}</h3>
            <p className="stat-card-label">Dispositivos registrados</p>
          </div>
        </div>
        <div className="stat-card stat-card-info">
          <div className="stat-card-icon"><Layers size={22} /></div>
          <div className="stat-card-content">
            <h3 className="stat-card-value">{categories.length}</h3>
            <p className="stat-card-label">Categorías disponibles</p>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-card-icon"><Wifi size={22} /></div>
          <div className="stat-card-content">
            <h3 className="stat-card-value">{sensorsOnline}</h3>
            <p className="stat-card-label">Sensores en línea</p>
          </div>
        </div>
        <div className="stat-card stat-card-danger">
          <div className="stat-card-icon"><WifiOff size={22} /></div>
          <div className="stat-card-content">
            <h3 className="stat-card-value">{sensorsOffline}</h3>
            <p className="stat-card-label">Sensores sin conexión</p>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-card-icon"><Zap size={22} /></div>
          <div className="stat-card-content">
            <h3 className="stat-card-value">{devices.reduce((a, d) => a + ((d.nominal_watts * (d.hours_daily_usage || 0)) / 1000), 0).toFixed(1)}</h3>
            <p className="stat-card-label">kWh estimados por día</p>
          </div>
        </div>
      </div>

      <PageSection
        icon={<Wrench size={18} />}
        title="Dispositivos del hogar"
        subtitle="Hacé clic en una fila para ver el detalle, las lecturas y el token del sensor."
        actions={
          <select className="form-select form-select-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
          </select>
        }
      >
        {loading ? <LoadingSpinner /> : (
          <DataTable
            columns={columns}
            data={filtered}
            onRowClick={(r) => navigate(`/devices/${r.id}`)}
            emptyMessage="No hay dispositivos registrados. Usá el botón «Registrar electrodoméstico»."
          />
        )}
      </PageSection>

      {showForm && (
        <DeviceFormModal
          categories={categories}
          applianceGroups={applianceGroups}
          initial={editDevice}
          saving={saving}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
