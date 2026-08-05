import React, { useState, useEffect } from 'react';
import { DollarSign, Calculator } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function TariffsPage() {
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calcKwh, setCalcKwh] = useState('');
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    api.tariffs.getProvinces().then(res => {
      const provs = res.data.provinces || res.data || [];
      setProvinces(provs);
      if (provs.length > 0) setSelectedProvince(provs[0].id || provs[0]._id);
    }).catch(() => toast.error('Error al cargar provincias'));
  }, []);

  useEffect(() => {
    if (!selectedProvince) return;
    setLoading(true);
    api.tariffs.getByProvince(selectedProvince).then(res => {
      setTariffs(res.data.tariffs || res.data || []);
    }).catch(() => toast.error('Error al cargar tarifas')).finally(() => setLoading(false));
  }, [selectedProvince]);

  const calculateCost = () => {
    const kwh = parseFloat(calcKwh);
    if (isNaN(kwh) || kwh < 0) return toast.error('Ingresá un valor válido');
    let total = 0;
    let remaining = kwh;
    for (const tier of tariffs) {
      const min = tier.tier_from || 0;
      const max = tier.tier_to || Infinity;
      const rate = tier.price_per_kwh || 0;
      const tierSize = max === Infinity ? remaining : max - min;
      const range = Math.min(remaining, tierSize);
      if (range > 0) {
        total += range * rate;
        remaining -= range;
      }
      if (remaining <= 0) break;
    }
    setCalcResult({ kwh, total: total.toFixed(2) });
  };

  const columns = [
    { header: 'Rango (kWh)', key: 'range', render: (_, r) => `${r.tier_from || 0} - ${r.tier_to || '∞'}` },
    { header: 'Precio ($/kWh)', key: 'price', render: (_, r) => `$${(r.price_per_kwh || 0).toFixed(4)}` },
  ];

  const selectedProvinceName = provinces.find(p => (p.id || p._id) === selectedProvince)?.name || '';

  return (
    <div>
      <div className="page-header">
        <h2><DollarSign size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Tarifas</h2>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">Seleccionar Provincia</label>
          <select className="form-select" value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)} style={{ maxWidth: 300 }}>
            {provinces.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
          </select>
        </div>
        {selectedProvinceName && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Distribuidora: {provinces.find(p => (p.id || p._id) === selectedProvince)?.distributor_name || 'N/A'}</p>}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="dashboard-charts">
          <div className="card">
            <h3 className="chart-title">Escalas Tarifarias — {selectedProvinceName}</h3>
            <DataTable columns={columns} data={tariffs} emptyMessage="No hay tarifas disponibles para esta provincia" />
          </div>

          <div className="tariff-calculator">
            <h3 className="chart-title"><Calculator size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Calculadora de Costo</h3>
            <div className="form-group">
              <label className="form-label">Consumo estimado (kWh)</label>
              <input className="form-input" type="number" step="0.01" value={calcKwh} onChange={e => setCalcKwh(e.target.value)} placeholder="Ej: 350" />
            </div>
            <button className="btn btn-primary" onClick={calculateCost}>Calcular</button>
            {calcResult && (
              <div style={{ marginTop: 20, padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Para {calcResult.kwh} kWh:</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>${calcResult.total}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
