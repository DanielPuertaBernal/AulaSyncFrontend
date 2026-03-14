import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import DataTable from '@/shared/components/DataTable';
import { usePrestamosAbiertos, useCrearPrestamo, useRegistrarDevolucion } from './prestamosApi';
import { equiposApi } from '@/features/equipos/equiposApi';
import { docentesApi } from '@/features/docentes/docentesApi';
import { showSuccess, showError, showWarning } from '@/shared/utils/alert';
import { UBICACIONES, UBICACIONES_LABEL } from '@/shared/constants';

function EstadoBadge({ estado }) {
  const map = {
    activo: 'bg-yellow-100 text-yellow-800',
    parcialmente_devuelto: 'bg-orange-100 text-orange-800',
    completamente_devuelto: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[estado] || ''}`}>
      {estado?.replace(/_/g, ' ')}
    </span>
  );
}

export default function PrestamosPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: prestamos = [], isLoading } = usePrestamosAbiertos();
  const crear = useCrearPrestamo();
  const devolver = useRegistrarDevolucion();
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [barcodePrestamo, setBarcodePrestamo] = useState('');
  const [barcodeDevolucion, setBarcodeDevolucion] = useState('');
  const [prestamoSeleccionadoId, setPrestamoSeleccionadoId] = useState('');
  const [resolviendoDocente, setResolviendoDocente] = useState(false);
  const inputPrestamoRef = useRef(null);
  const inputDevolucionRef = useRef(null);
  const ultimoScanPrestamoRef = useRef('');
  const ultimoScanDevolucionRef = useRef('');
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const docenteCodigo = watch('docente_codigo_nfc') || '';

  const prestamoSeleccionado = useMemo(
    () => prestamos.find((p) => String(p._id) === String(prestamoSeleccionadoId)) || null,
    [prestamos, prestamoSeleccionadoId]
  );

  const pendientesSeleccionados = useMemo(
    () => (prestamoSeleccionado?.equipos || []).filter((e) => e.estado_equipo === 'entregado'),
    [prestamoSeleccionado]
  );

  useEffect(() => {
    if (!prestamoSeleccionadoId) return;
    if (!prestamoSeleccionado || pendientesSeleccionados.length === 0) {
      setPrestamoSeleccionadoId('');
      setBarcodeDevolucion('');
    }
  }, [prestamoSeleccionadoId, prestamoSeleccionado, pendientesSeleccionados.length]);

  function normalizarCodigoEscaneado(codigo = '') {
    return String(codigo)
      .trim()
      .toUpperCase()
      .replace(/["'`]+/g, '-')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function posiblesCodigos(codigo = '') {
    const raw = String(codigo || '').trim().toUpperCase();
    const normalizado = normalizarCodigoEscaneado(raw);
    return [...new Set([raw, normalizado].filter(Boolean))];
  }

  useEffect(() => {
    if (!showForm) return;
    const identificador = String(docenteCodigo).trim();
    if (!identificador || identificador.length < 4) {
      setValue('docente_nombre', '');
      return;
    }

    const timer = setTimeout(async () => {
      const nombre = await resolverNombreDocente(identificador);
      setValue('docente_nombre', nombre || '');
    }, 350);

    return () => clearTimeout(timer);
  }, [docenteCodigo, setValue, showForm]);

  async function resolverNombreDocente(identificador) {
    setResolviendoDocente(true);
    try {
      const preferirDocumento = /^\d+$/.test(identificador);

      if (preferirDocumento) {
        try {
          const porDocumento = await docentesApi.buscarPorDocumento(identificador);
          return porDocumento.data?.data?.docente?.nombre || '';
        } catch (_) {
          const porCarnet = await docentesApi.buscarPorCarnet(identificador);
          return porCarnet.data?.data?.docente?.nombre || '';
        }
      }

      try {
        const porCarnet = await docentesApi.buscarPorCarnet(identificador);
        return porCarnet.data?.data?.docente?.nombre || '';
      } catch (_) {
        const porDocumento = await docentesApi.buscarPorDocumento(identificador);
        return porDocumento.data?.data?.docente?.nombre || '';
      }
    } catch (_) {
      return '';
    } finally {
      setResolviendoDocente(false);
    }
  }

  function equipoPrestadoEnAbiertos(equipoId) {
    return prestamos.some((p) =>
      (p.equipos || []).some(
        (eq) => String(eq.equipo_id) === String(equipoId) && eq.estado_equipo === 'entregado'
      )
    );
  }

  async function agregarPorCodigoBarras(codigoEntrada = barcodePrestamo) {
    const codigo = String(codigoEntrada || '').trim();
    if (!codigo) return;
    try {
      let equipo = null;
      const candidatos = posiblesCodigos(codigo);
      for (const c of candidatos) {
        try {
          const res = await equiposApi.buscarBarcode(c);
          equipo = res.data?.data?.equipo;
          if (equipo) break;
        } catch (_) {
          // Probar siguiente variante del código escaneado
        }
      }
      if (!equipo) return showWarning('No se encontró equipo para ese código');
      if (equiposSeleccionados.some((eq) => String(eq._id) === String(equipo._id))) {
        return showWarning('Ese equipo ya está agregado al carrito');
      }
      if (equipoPrestadoEnAbiertos(equipo._id)) {
        return showWarning('Ese equipo ya se encuentra en un préstamo activo');
      }
      if (equipo.estado !== 'activo') {
        return showWarning(`El equipo está en estado '${equipo.estado}' y no se puede prestar`);
      }
      setEquiposSeleccionados((prev) => [...prev, equipo]);
      setBarcodePrestamo('');
      ultimoScanPrestamoRef.current = '';
      inputPrestamoRef.current?.focus();
    } catch (err) {
      showError(err.response?.data?.message || 'No se pudo leer el código de barras');
    }
  }

  function quitarDelCarrito(equipoId) {
    setEquiposSeleccionados((prev) => prev.filter((eq) => String(eq._id) !== String(equipoId)));
  }

  async function onCrear(data) {
    if (!equiposSeleccionados.length) return showWarning('Seleccione al menos un equipo');
    if (!String(data.docente_nombre || '').trim()) {
      return showWarning('No se encontró docente para ese documento/carnet');
    }
    try {
      await crear.mutateAsync({
        ...data,
        ubicacion_prestamo: UBICACIONES.OFICINA,
        equipos: equiposSeleccionados.map((eq) => String(eq._id)),
      });
      reset();
      setEquiposSeleccionados([]);
      setBarcodePrestamo('');
      setShowForm(false);
      showSuccess('Préstamo registrado correctamente');
    } catch (err) {
      showError(err.response?.data?.message || 'Error al registrar préstamo');
    }
  }

  async function devolverPorCodigoBarras(codigoEntrada = barcodeDevolucion) {
    if (!prestamoSeleccionado) return showWarning('Seleccione un préstamo');
    const codigo = String(codigoEntrada || '').trim();
    if (!codigo) return;

    const codigos = posiblesCodigos(codigo);

    const equipo = pendientesSeleccionados.find(
      (eq) => codigos.includes(String(eq.equipo_codigo_barras || '').toUpperCase())
    );

    if (!equipo) {
      return showWarning('Ese código no corresponde a un equipo pendiente de este préstamo');
    }

    try {
      await devolver.mutateAsync({
        prestamo_id: String(prestamoSeleccionado._id),
        docente_codigo_nfc: prestamoSeleccionado.docente_codigo_nfc,
        docente_nombre: prestamoSeleccionado.docente_nombre,
        ubicacion_devolucion: UBICACIONES.OFICINA,
        equipos: [String(equipo.equipo_id)],
      });
      setBarcodeDevolucion('');
      ultimoScanDevolucionRef.current = '';
      inputDevolucionRef.current?.focus();
      showSuccess(`Equipo devuelto: ${equipo.equipo_nombre}`);
    } catch (err) {
      showError(err.response?.data?.message || 'No se pudo registrar la devolución');
    }
  }

  useEffect(() => {
    if (!showForm) return;
    const valor = barcodePrestamo.trim();
    if (!valor) return;

    const timer = setTimeout(async () => {
      const normalizado = normalizarCodigoEscaneado(valor);
      if (!normalizado || normalizado === ultimoScanPrestamoRef.current) return;
      ultimoScanPrestamoRef.current = normalizado;
      await agregarPorCodigoBarras(valor);
    }, 120);

    return () => clearTimeout(timer);
  }, [barcodePrestamo, showForm]);

  useEffect(() => {
    if (!prestamoSeleccionado) return;
    const valor = barcodeDevolucion.trim();
    if (!valor) return;

    const timer = setTimeout(async () => {
      const normalizado = normalizarCodigoEscaneado(valor);
      if (!normalizado || normalizado === ultimoScanDevolucionRef.current) return;
      ultimoScanDevolucionRef.current = normalizado;
      await devolverPorCodigoBarras(valor);
    }, 120);

    return () => clearTimeout(timer);
  }, [barcodeDevolucion, prestamoSeleccionado]);

  const columns = [
    {
      key: 'docente_nombre',
      label: 'Docente',
      render: (v, row) => (
        <button
          onClick={() => {
            setPrestamoSeleccionadoId(String(row._id));
            setBarcodeDevolucion('');
            setTimeout(() => inputDevolucionRef.current?.focus(), 0);
          }}
          className="text-primary hover:underline font-medium"
          title="Abrir devolución por escaneo"
        >
          {v || '—'}
        </button>
      ),
    },
    { key: 'docente_codigo_nfc', label: 'Documento / Carnet' },
    { key: 'ubicacion_prestamo', label: 'Ubicación', render: (v) => UBICACIONES_LABEL[v] || '—' },
    { key: 'auxiliar_prestamista', label: 'Auxiliar' },
    {
      key: 'equipos',
      label: 'Pendientes',
      render: (v) => {
        const pendientes = Array.isArray(v) ? v.filter((e) => e.estado_equipo === 'entregado') : [];
        return <span>{pendientes.length}</span>;
      },
    },
    {
      key: 'equipos',
      label: 'Equipos',
      render: (v) => {
        const pendientes = Array.isArray(v) ? v.filter((e) => e.estado_equipo === 'entregado') : [];
        return <span>{pendientes.map((e) => e.equipo_nombre).join(', ') || '—'}</span>;
      },
    },
    { key: 'estado', label: 'Estado', render: (v) => <EstadoBadge estado={v} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-box mr-2" />Préstamos de Equipos</h1>
          <p className="text-gray-500 text-sm">{prestamos.length} abiertos</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Préstamo'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-xl">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar préstamo (tipo carrito)</h2>
          <form onSubmit={handleSubmit(onCrear)} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Documento / Carnet Docente</label>
              <input {...register('docente_codigo_nfc', { required: true })} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <p className="text-xs text-gray-500 mt-1">
                {resolviendoDocente ? 'Buscando docente...' : 'Al digitar documento o carnet se completa el nombre automáticamente'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Docente</label>
              <input
                {...register('docente_nombre', { required: true })}
                readOnly
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación del préstamo</label>
              <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {UBICACIONES_LABEL[UBICACIONES.OFICINA]}
              </div>
              <p className="text-xs text-gray-500 mt-1">Los préstamos de equipos solo se registran en la oficina.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Escanear código de barras</label>
              <div className="flex gap-2">
                <input
                  ref={inputPrestamoRef}
                  value={barcodePrestamo}
                  onChange={(e) => setBarcodePrestamo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarPorCodigoBarras();
                    }
                  }}
                  placeholder="Ej: INV-M-303-001"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={agregarPorCodigoBarras}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Carrito de equipos</label>
              <div className="max-h-44 overflow-y-auto border rounded-lg p-2 space-y-2">
                {equiposSeleccionados.map((eq) => (
                  <div key={String(eq._id)} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                    <div>
                      <p className="font-medium text-gray-800">{eq.nombre} - {eq.marca}</p>
                      <p className="text-gray-500 text-xs">{eq.codigo_inventario} | {eq.codigo_barras}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarDelCarrito(eq._id)}
                      className="text-red-600 hover:text-red-700 text-xs font-semibold"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                {!equiposSeleccionados.length && (
                  <p className="text-gray-400 text-sm py-2 text-center">Escanee códigos para agregar equipos</p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={crear.isPending}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {crear.isPending ? 'Registrando...' : 'Registrar Préstamo'}
            </button>
          </form>
        </div>
      )}

      <DataTable columns={columns} data={prestamos} loading={isLoading} searchable />

      {prestamoSeleccionado && (
        <div className="bg-white rounded-lg shadow p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">
              Devolución parcial por escaneo: {prestamoSeleccionado.docente_nombre}
            </h3>
            <button
              onClick={() => setPrestamoSeleccionadoId('')}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Cerrar
            </button>
          </div>

          <p className="text-sm text-gray-600">
            Documento/Carnet: <b>{prestamoSeleccionado.docente_codigo_nfc}</b> | Pendientes: <b>{pendientesSeleccionados.length}</b>
          </p>
          <p className="text-sm text-gray-600">
            Ubicación de devolución: <b>{UBICACIONES_LABEL[UBICACIONES.OFICINA]}</b>
          </p>

          <div className="flex gap-2">
            <input
              ref={inputDevolucionRef}
              value={barcodeDevolucion}
              onChange={(e) => setBarcodeDevolucion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  devolverPorCodigoBarras();
                }
              }}
              placeholder="Escanee código para devolver"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={devolverPorCodigoBarras}
              disabled={devolver.isPending}
              className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-60"
            >
              Devolver
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Equipo</th>
                  <th className="table-header">Código</th>
                  <th className="table-header">Código de barras</th>
                </tr>
              </thead>
              <tbody>
                {pendientesSeleccionados.map((eq) => (
                  <tr key={`${eq.equipo_id}-${eq.fecha_entrega || ''}`} className="border-t">
                    <td className="table-cell">{eq.equipo_nombre}</td>
                    <td className="table-cell">{eq.equipo_codigo || '—'}</td>
                    <td className="table-cell">{eq.equipo_codigo_barras || '—'}</td>
                  </tr>
                ))}
                {!pendientesSeleccionados.length && (
                  <tr>
                    <td colSpan={3} className="table-cell text-gray-500">No hay equipos pendientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
