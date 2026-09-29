import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Plus, Trash2, History, FileSpreadsheet, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { parseTariffFile, plantillaCSV, normProvincia, ACCEPTED_EXTENSIONS } from '../../utils/tariffFileParser';

/* Dos nombres de provincia se consideran el mismo si uno contiene al otro
   una vez normalizados. Es lo que hace falta en la practica: el tarifario
   exportado suele traer "Buenos Aires" y la base lo llama "Buenos Aires
   (AMBA)". Una igualdad exacta daria un falso positivo en cada provincia con
   sede, que es justo donde el error de subir el tarifario equivocado cuesta
   mas. */
const sameProvincia = (a, b) => {
  const na = normProvincia(a);
  const nb = normProvincia(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

/* Fila vacia con el shape exacto que espera el backend. Los precios N2/N3 se
   dejan vacios (no 0) a proposito: null significa "no aplica para este
   escalon", mientras que 0 seria un precio real de cero. */
const blankRow = (i) => ({
  category: `R${i + 1}`,
  tier_from: '',
  tier_to: '',
  price_per_kwh: '',
  price_per_kwh_n2: '',
  price_per_kwh_n3: '',
  fixed_charge: '',
});

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Convierte una tarifa de la BD a fila editable, preservando null vs ''. */
const toRow = (tar) => ({
  category: tar.category || '',
  tier_from: tar.tier_from ?? '',
  tier_to: tar.tier_to ?? '',
  price_per_kwh: tar.price_per_kwh ?? '',
  price_per_kwh_n2: tar.price_per_kwh_n2 ?? '',
  price_per_kwh_n3: tar.price_per_kwh_n3 ?? '',
  fixed_charge: tar.fixed_charge ?? '',
});

export default function AdminTariffsPage() {
  const { t } = useTranslation();

  const [provinces, setProvinces] = useState([]);
  const [provinceId, setProvinceId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [tariffs, setTariffs] = useState([]);
  const [rows, setRows] = useState([blankRow(1)]);
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState({});
  const [importing, setImporting] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const archivoRef = useRef(null);

  /* Importar un tarifario NO sube nada: solo llena la grilla de abajo, que ya
     es editable. El admin revisa los numeros, corrige lo que haga falta y
     recien ahi toca "Cargar tarifario". Subir directo desde el archivo seria
     un salto sin red: si el archivo esta mal headedado, se pisa el tarifario
     vigente de la provincia y no hay forma de deshacerlo. */
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    // Se limpia el input para poder volver a elegir el MISMO archivo: si no,
    // cambiar de opinion y elegirlo de nuevo no dispara el evento.
    e.target.value = '';
    if (!f) return;
    setImporting(true);
    try {
      const { rows, avisos, provincia, nombre } = await parseTariffFile(f);
      if (!rows.length) {
        toast.error(t('admin.tariffs.import_no_rows'));
        return;
      }
      setRows(rows);
      setRowErrors({});
      setArchivo({ nombre, provincia, cantidad: rows.length });

      // Si el archivo viene con columna de provincia y no es la que esta
      // seleccionada, avisar antes de que se confunda: searia cargar el
      // tarifario de Mendoza sobre Buenos Aires.
      if (provincia && selected && !sameProvincia(provincia, selected.name)) {
        toast.error(t('admin.tariffs.import_other_province').replace('{{provincia}}', provincia));
      } else {
        toast.success(t('admin.tariffs.import_ok').replace('{{n}}', String(rows.length)));
      }
      avisos.forEach((a) => toast(a, { icon: '⚠' }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const descargarPlantilla = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + plantillaCSV()], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-tarifario.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    api.tariffs.getProvinces()
      .then((r) => {
        const list = r.data.provinces || r.data || [];
        setProvinces(list);
        if (list.length) setProvinceId(String(list[0].id));
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const load = useCallback(async () => {
    if (!provinceId) return;
    setLoading(true);
    try {
      const res = await api.admin.getTariffs({ province_id: provinceId, only_current: showHistory ? 'false' : 'true' });
      const list = res.data.tariffs || [];
      setTariffs(list);
      // Solo se pisa el formulario cuando no hay edicion en curso: si no, al
      // cambiar de provincia se perderian los numeros tipeados.
      if (showHistory) setRows([]);
      else if (list.length) setRows(list.map(toRow));
      else setRows([blankRow(1)]);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [provinceId, showHistory]);

  useEffect(() => { load(); }, [load]);

  const setRow = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setRowErrors((prev) => {
      if (!prev[i]) return prev;
      const next = { ...prev };
      delete next[i];
      return next;
    });
  };

  /* Validacion en el cliente para feedback inmediato. El backend vuelve a
     validar igual: esto es solo para no hacer un round-trip por cada tecla. */
  const validate = () => {
    const errors = {};
    rows.forEach((row, i) => {
      if (row.tier_from === '' || Number.isNaN(Number(row.tier_from)) || Number(row.tier_from) < 0) {
        errors[i] = t('admin.tariffs.from');
      } else if (row.price_per_kwh === '' || Number(row.price_per_kwh) < 0) {
        errors[i] = t('admin.tariffs.n1');
      } else if (row.tier_to !== '' && Number(row.tier_to) <= Number(row.tier_from)) {
        errors[i] = t('admin.tariffs.to');
      }
    });
    setRowErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error(t('common.error'));
      return;
    }
    setSaving(true);
    try {
      const res = await api.admin.bulkUploadTariffs({
        province_id: Number(provinceId),
        effective_from: effectiveFrom,
        rows,
      });
      toast.success(`${t('admin.tariffs.uploaded')}: ${res.data.created}`);
      setShowHistory(false);
      load();
    } catch (e) {
      const details = e.response?.data?.details;
      if (Array.isArray(details)) details.forEach((d) => toast.error(d));
      else toast.error(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeTariff = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('admin.tariffs.delete_confirm'))) return;
    try {
      await api.admin.deleteTariff(id);
      toast.success(t('admin.tariffs.deleted'));
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
  };

  const addRow = () => setRows((prev) => [...prev, blankRow(prev.length + 1)]);
  const dropRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const selected = provinces.find((p) => String(p.id) === String(provinceId));

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h2>{t('admin.tab.tariffs')}</h2>
        <button
          type="button"
          className={`btn btn-ghost ${showHistory ? 'btn-active' : ''}`}
          onClick={() => setShowHistory((v) => !v)}
        >
          <History size={15} /> {t('admin.tariffs.history')}
        </button>
      </div>

      <div className="admin-filters">
        <label className="admin-field">
          <span>{t('admin.tariffs.province')}</span>
          <select
            value={provinceId}
            onChange={(e) => {
              setProvinceId(e.target.value);
              // El archivo importado era de la provincia anterior: dejar el
              // aviso puesto dira "estas revisando el tarifario de X" cuando
              // en realidad se esta por subir el de otra.
              setArchivo(null);
            }}
          >
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <LoadingSpinner /> : !provinceId ? (
        <p className="admin-empty">{t('admin.tariffs.select_province')}</p>
      ) : showHistory ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.tariffs.tier')}</th>
                <th>{t('admin.tariffs.from')}</th>
                <th>{t('admin.tariffs.to')}</th>
                <th>{t('admin.tariffs.n1')}</th>
                <th>{t('admin.tariffs.n2')}</th>
                <th>{t('admin.tariffs.n3')}</th>
                <th>{t('admin.tariffs.effective_from')}</th>
                <th style={{ textAlign: 'right' }}>{t('common.delete')}</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map((tar) => (
                <tr key={tar.id} className={tar.is_current ? '' : 'admin-row-inactive'}>
                  <td><span className="tier-chip">{tar.category}</span></td>
                  <td>{tar.tier_from}</td>
                  <td>{tar.tier_to ?? '∞'}</td>
                  <td>{tar.price_per_kwh}</td>
                  <td>{tar.price_per_kwh_n2 ?? '—'}</td>
                  <td>{tar.price_per_kwh_n3 ?? '—'}</td>
                  <td>{tar.effective_from?.slice(0, 10)}</td>
                  <td className="admin-row-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeTariff(tar.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!tariffs.length && (
                <tr><td colSpan={8} className="admin-empty">{t('common.no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <form className="admin-card" onSubmit={submit}>
          <p className="admin-hint">{t('admin.tariffs.upload_hint')}</p>

          {/* Importacion de archivo. El input esta oculto y se dispara con el
              boton: un <label for> sobre un input oculto funciona igual pero
              no deja cambiar el texto del boton segun el estado. */}
          <div className="admin-import">
            <input
              ref={archivoRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={onFile}
              className="admin-file-input"
              aria-label={t('admin.tariffs.import')}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => archivoRef.current?.click()}
              disabled={importing}
            >
              <FileSpreadsheet size={15} /> {t('admin.tariffs.import')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={descargarPlantilla}>
              <Download size={15} /> {t('admin.tariffs.template')}
            </button>
            <span className="admin-hint">{t('admin.tariffs.import_formats')}</span>
          </div>

          {/* Que archivo se esta por cargar. Importar no sube nada todavia:
              las filas quedan en la grilla de abajo para revisar. */}
          {archivo && (
            <p className="admin-hint admin-import-loaded">
              {t('admin.tariffs.imported_from').replace('{{archivo}}', archivo.nombre)}
            </p>
          )}

          <div className="admin-form-grid">
            <label>
              <span>{t('admin.tariffs.province')}</span>
              <strong>{selected?.name}</strong>
            </label>
            <label>
              <span>{t('admin.tariffs.effective_from')}</span>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.tariffs.tier')}</th>
                  <th>{t('admin.tariffs.from')}</th>
                  <th>{t('admin.tariffs.to')}</th>
                  <th>{t('admin.tariffs.n1')}</th>
                  <th>{t('admin.tariffs.n2')}</th>
                  <th>{t('admin.tariffs.n3')}</th>
                  <th>{t('admin.tariffs.fixed')}</th>
                  <th style={{ textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={rowErrors[i] ? 'admin-row-error' : ''}>
                    <td>
                      <input
                        className="admin-input-sm"
                        value={row.category}
                        onChange={(e) => setRow(i, 'category', e.target.value)}
                        aria-label={t('admin.tariffs.tier')}
                      />
                    </td>
                    {['tier_from', 'tier_to', 'price_per_kwh', 'price_per_kwh_n2', 'price_per_kwh_n3', 'fixed_charge'].map((f) => (
                      <td key={f}>
                        <input
                          className="admin-input-sm"
                          type="number"
                          step="any"
                          min="0"
                          value={row[f]}
                          onChange={(e) => setRow(i, f, e.target.value)}
                          aria-label={f}
                        />
                      </td>
                    ))}
                    <td className="admin-row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => dropRow(i)}
                        disabled={rows.length === 1}
                        title={t('admin.tariffs.remove_row')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rowErrors && Object.keys(rowErrors).length > 0 && (
            <p className="admin-form-error" role="alert">
              {Object.keys(rowErrors).length} {t('common.error').toLowerCase()}
            </p>
          )}

          <div className="admin-form-actions">
            <button type="button" className="btn btn-ghost" onClick={addRow}>
              <Plus size={15} /> {t('admin.tariffs.add_row')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Upload size={15} /> {t('admin.tariffs.upload')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
