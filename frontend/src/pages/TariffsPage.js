import React, { useState, useEffect } from 'react';
import { DollarSign, Calculator, MapPin, Scale, Building2 } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageSection from '../components/common/PageSection';
import Field from '../components/common/Field';
import toast from 'react-hot-toast';
import { useTranslation } from '../context/LanguageContext';

export default function TariffsPage() {
  const { t } = useTranslation();
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
    }).catch(() => toast.error(t('tariffs.error_province')));
  }, []);

  useEffect(() => {
    if (!selectedProvince) return;
    setLoading(true);
    api.tariffs.getByProvince(selectedProvince).then(res => {
      setTariffs(res.data.tariffs || res.data || []);
    }).catch(() => toast.error(t('tariffs.error_tariffs'))).finally(() => setLoading(false));
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
    { header: t('tariffs.col_range'), key: 'range', render: (_, r) => <span className="table-mono">{r.tier_from || 0} - {r.tier_to || '∞'}</span> },
    { header: t('tariffs.col_price'), key: 'price', render: (_, r) => <span className="table-mono"><strong>${(r.price_per_kwh || 0).toFixed(4)}</strong></span> },
  ];

  const selectedProvinceData = provinces.find(p => (p.id || p._id) === selectedProvince);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2><DollarSign size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('tariffs.title')}</h2>
          <p className="page-header-subtitle">{t('tariffs.subtitle')}</p>
        </div>
      </div>

      <PageSection
        icon={<MapPin size={18} />}
        title={t('tariffs.select_province')}
        subtitle={selectedProvinceData ? `${t('tariffs.distributor')} ${selectedProvinceData.distributor_name || 'N/A'} · ${t('tariffs.regulator')} ${selectedProvinceData.regulator_name || 'N/A'}` : t('tariffs.select_hint')}
        style={{ marginBottom: 24 }}
      >
        <div className="province-picker">
          <Building2 size={18} />
          <select className="form-select" value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)}>
            {provinces.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
          </select>
        </div>
      </PageSection>

      {loading ? <LoadingSpinner /> : (
        <div className="dashboard-charts">
          <PageSection
            icon={<Scale size={18} />}
            title={t('tariffs.scale_title', { province: selectedProvinceData?.name })}
            subtitle={t('tariffs.scale_subtitle')}
            style={{ marginBottom: 0 }}
          >
            <DataTable columns={columns} data={tariffs} emptyMessage={t('tariffs.empty')} />
          </PageSection>

          <PageSection
            icon={<Calculator size={18} />}
            title={t('tariffs.calc_title')}
            subtitle={t('tariffs.calc_subtitle')}
            style={{ marginBottom: 0 }}
          >
            <div className="form-group">
              <Field label={t('tariffs.calc_input')} icon={<DollarSign size={15} />} hint={t('tariffs.calc_hint')}>
                <input className="form-input" type="number" step="0.01" min="0" value={calcKwh} onChange={e => setCalcKwh(e.target.value)} placeholder={t('tariffs.calc_placeholder')} />
              </Field>
            </div>
            <button className="btn btn-primary" onClick={calculateCost}>{t('tariffs.calc_button')}</button>
            {calcResult && (
              <div className="calc-result">
                <div className="calc-result-label">{t('tariffs.calc_result', { kwh: calcResult.kwh })}</div>
                <div className="calc-result-value">${calcResult.total}</div>
              </div>
            )}
          </PageSection>
        </div>
      )}
    </div>
  );
}
