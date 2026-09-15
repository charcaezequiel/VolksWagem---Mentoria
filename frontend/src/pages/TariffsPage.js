import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Calculator, MapPin, Scale, Building2, Zap, Info } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageSection from '../components/common/PageSection';
import Field from '../components/common/Field';
import toast from 'react-hot-toast';
import { useTranslation } from '../context/LanguageContext';

const fmtARS = (value) => {
  if (value == null) return '-';
  return `$${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};

const fmtRate = (value) => {
  if (value == null) return '-';
  return `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const estRange = (min, max) => {
  if (min == null) return '-';
  if (max == null) return `${fmtARS(min)}+`;
  return `${fmtARS(min)} – ${fmtARS(max)}`;
};

export default function TariffsPage() {
  const { t } = useTranslation();
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calcKwh, setCalcKwh] = useState('');
  const [calcSubsidy, setCalcSubsidy] = useState('N1');
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

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
    if (isNaN(kwh) || kwh < 0) return toast.error(t('tariffs.calc_invalid'));
    setCalcLoading(true);
    api.tariffs.estimate(selectedProvince, kwh, calcSubsidy)
      .then(res => setCalcResult(res.data.result))
      .catch(() => toast.error(t('tariffs.error_estimate')))
      .finally(() => setCalcLoading(false));
  };

  const columns = useMemo(() => [
    { header: t('tariffs.col_category'), key: 'category', render: (_, r) => <span className="tariff-badge">{r.category || '—'}</span> },
    { header: t('tariffs.col_range'), key: 'range', render: (_, r) => <span className="table-mono">{r.tier_from || 0} - {r.tier_to || t('tariffs.up_to')}</span> },
    { header: t('tariffs.col_fixed'), key: 'fixed', render: (_, r) => <span className="table-mono"><strong>{fmtARS(r.fixed_charge)}</strong></span> },
    {
      header: t('tariffs.col_n1'),
      key: 'n1',
      render: (_, r) => (
        <div className="tariff-rate-cell">
          <span className="table-mono">{fmtRate(r.price_per_kwh)}</span>
          <small>{estRange(r.estimated_min_n1, r.estimated_max_n1)}</small>
        </div>
      ),
    },
    {
      header: t('tariffs.col_n2'),
      key: 'n2',
      render: (_, r) => (
        <div className="tariff-rate-cell">
          <span className="table-mono">{fmtRate(r.price_per_kwh_n2)}</span>
          <small>{estRange(r.estimated_min_n2, r.estimated_max_n2)}</small>
        </div>
      ),
    },
    {
      header: t('tariffs.col_n3'),
      key: 'n3',
      render: (_, r) => (
        <div className="tariff-rate-cell">
          <span className="table-mono">{fmtRate(r.price_per_kwh_n3)}</span>
          <small>{estRange(r.estimated_min_n3, r.estimated_max_n3)}</small>
        </div>
      ),
    },
  ], [t]);

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
            <div className="tariff-legend">
              <Info size={15} />
              <span><strong>N1</strong> {t('tariffs.legend_n1')} · <strong>N2</strong> {t('tariffs.legend_n2')} · <strong>N3</strong> {t('tariffs.legend_n3')}</span>
            </div>
          </PageSection>

          <PageSection
            icon={<Calculator size={18} />}
            title={t('tariffs.calc_title')}
            subtitle={t('tariffs.calc_subtitle')}
            style={{ marginBottom: 0 }}
          >
            <div className="form-group">
              <Field label={t('tariffs.calc_input')} icon={<Zap size={15} />} hint={t('tariffs.calc_hint')}>
                <input className="form-input" type="number" step="0.01" min="0" value={calcKwh} onChange={e => setCalcKwh(e.target.value)} placeholder={t('tariffs.calc_placeholder')} />
              </Field>
              <Field label={t('tariffs.calc_subsidy')} hint={t('tariffs.calc_subsidy_hint')}>
                <select className="form-select" value={calcSubsidy} onChange={e => setCalcSubsidy(e.target.value)}>
                  <option value="N1">N1 — {t('tariffs.subsidy_n1')}</option>
                  <option value="N2">N2 — {t('tariffs.subsidy_n2')}</option>
                  <option value="N3">N3 — {t('tariffs.subsidy_n3')}</option>
                </select>
              </Field>
            </div>
            <button className="btn btn-primary" onClick={calculateCost} disabled={calcLoading}>
              {calcLoading ? '...' : t('tariffs.calc_button')}
            </button>
            {calcResult && (
              <div className="calc-result">
                <div className="calc-result-label">
                  {t('tariffs.calc_result', { kwh: calcKwh })}
                  {calcResult.category?.category && <span className="calc-result-cat">{calcResult.category.category}</span>}
                </div>
                <div className="calc-result-grid">
                  <span>{t('tariffs.breakdown_fixed')}</span><strong>{fmtARS(calcResult.fixed_charge)}</strong>
                  <span>{t('tariffs.breakdown_variable')}</span><strong>{fmtARS(calcResult.variable_cost)}</strong>
                  <span>{t('tariffs.breakdown_base')}</span><strong>{fmtARS(calcResult.total_cost)}</strong>
                  <span className="calc-total-label">{t('tariffs.breakdown_estimated')}</span>
                  <strong className="calc-total-value">{fmtARS(calcResult.estimated_total)}</strong>
                </div>
                <div className="calc-result-hint">{t('tariffs.calc_estimate_hint')}</div>
              </div>
            )}
          </PageSection>
        </div>
      )}
    </div>
  );
}