import { useEffect, useMemo, useRef, useState } from 'react';
import { useNFCSocket } from '@/features/nfc/useNFCSocket';
import { useNFCStore } from '@/features/nfc/nfcStore';
import { useForm } from 'react-hook-form';
import DataTable from '@/shared/components/DataTable';
import { usePrestamosAbiertos, useCrearPrestamo, useRegistrarDevolucion } from './prestamosApi';
import { equiposApi } from '@/features/equipos/equiposApi';
import { comunidadApi } from '@/features/comunidad/comunidadApi';
import { useUbicacionesOperativas } from '@/shared/hooks/useUbicacionesOperativas';
import { showSuccess, showError, showWarning } from '@/shared/utils/alert';
import { NFC_MODOS, UBICACIONES } from '@/shared/constants';
import { Package, CreditCard, Clock, Loader2 } from 'lucide-react';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import { cn } from '@/shared/lib/utils';
import { abrirBuscadorPersonaPorNombre } from '@/shared/utils/personaSearchHotkey';

function EstadoBadge({ estado }) {
  const map = {
    activo: 'warning',
    parcialmente_devuelto: 'orange',
    completamente_devuelto: 'success',
  };
  return (
    <StatusBadge variant={map[estado] || 'neutral'}>
      {estado?.replace(/_/g, ' ')}
    </StatusBadge>
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
  const {
    getUbicacionLabel,
    prestamoEquiposOptions,
    identificacionOptions,
    ubicacionPrestamoEquiposDefault,
  } = useUbicacionesOperativas();
  const [ubicacionPrestamo, setUbicacionPrestamo] = useState(ubicacionPrestamoEquiposDefault);
  const [ubicacionDevolucion, setUbicacionDevolucion] = useState(ubicacionPrestamoEquiposDefault);
  const [equiposParaDevolver, setEquiposParaDevolver] = useState([]);
  const inputPrestamoRef = useRef(null);
  const inputDevolucionRef = useRef(null);
  const ultimoScanPrestamoRef = useRef('');
  const ultimoScanDevolucionRef = useRef('');
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const docenteCodigo = watch('docente_codigo_nfc') || '';
  const { registrarIntencion, cancelarIntencion } = useNFCSocket();
  const ultimoCarnet = useNFCStore((s) => s.ultimoCarnet);
  const intencionActiva = useNFCStore((s) => s.intencionActiva);
  const enCola = useNFCStore((s) => s.enCola);
  const posicionCola = useNFCStore((s) => s.posicionCola);
  const ultimoCarnetRef = useRef(null);

  const prestamoSeleccionado = useMemo(
    () => prestamos.find((p) => String(p._id) === String(prestamoSeleccionadoId)) || null,
    [prestamos, prestamoSeleccionadoId]
  );

  const pendientesSeleccionados = useMemo(
    () => (prestamoSeleccionado?.equipos || []).filter((e) => e.estado_equipo === 'entregado'),
    [prestamoSeleccionado]
  );

  const opcionesPrestamoEquipos = useMemo(
    () => (prestamoEquiposOptions.length
      ? prestamoEquiposOptions
      : [{ clave: ubicacionPrestamoEquiposDefault, nombre: getUbicacionLabel(ubicacionPrestamoEquiposDefault) }]),
    [prestamoEquiposOptions, ubicacionPrestamoEquiposDefault, getUbicacionLabel]
  );

  const opcionesIdentificacion = useMemo(
    () => (identificacionOptions.length
      ? identificacionOptions
      : [{ clave: UBICACIONES.OFICINA, nombre: getUbicacionLabel(UBICACIONES.OFICINA) }]),
    [identificacionOptions, getUbicacionLabel]
  );

  useEffect(() => {
    setUbicacionPrestamo(ubicacionPrestamoEquiposDefault);
    setUbicacionDevolucion(ubicacionPrestamoEquiposDefault);
  }, [ubicacionPrestamoEquiposDefault]);

  useEffect(() => {
    if (!prestamoSeleccionadoId) return;
    if (!prestamoSeleccionado || pendientesSeleccionados.length === 0) {
      setPrestamoSeleccionadoId('');
      setBarcodeDevolucion('');
      setEquiposParaDevolver([]);
    }
  }, [prestamoSeleccionadoId, prestamoSeleccionado, pendientesSeleccionados.length]);

  // Registrar intención NFC cuando el formulario está abierto (sin auto-re-registro)
  useEffect(() => {
    if (showForm) {
      registrarIntencion(NFC_MODOS.IDENTIFICACION);
    } else {
      cancelarIntencion();
    }
    return () => cancelarIntencion();
  }, [showForm]);

  // Auto-llenar docente_codigo_nfc cuando se acerca el carnet
  useEffect(() => {
    if (!showForm || !ultimoCarnet) return;
    if (ultimoCarnet.ubicacion && !opcionesIdentificacion.some((ubicacion) => ubicacion.clave === ultimoCarnet.ubicacion)) {
      showWarning(`La ubicación ${getUbicacionLabel(ultimoCarnet.ubicacion)} no está habilitada para identificación NFC en préstamos de equipos`);
      return;
    }
    if (ultimoCarnet === ultimoCarnetRef.current) return;
    ultimoCarnetRef.current = ultimoCarnet;
    setValue('docente_codigo_nfc', ultimoCarnet.id_carnet, { shouldDirty: true, shouldValidate: true });
  }, [ultimoCarnet, showForm, setValue]);

  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (e) => {
      if (e.key !== 'F1') return;
      e.preventDefault();
      void handleBuscarDocentePorNombreF1();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm]);

  async function handleBuscarDocentePorNombreF1() {
    const persona = await abrirBuscadorPersonaPorNombre({
      titulo: 'Buscar docente por nombre (F1)',
      tipo: 'docente',
      placeholder: 'Nombre del docente',
    });
    if (!persona) return;
    setValue('docente_codigo_nfc', persona.numero_documento || '', { shouldDirty: true, shouldValidate: true });
    setValue('docente_nombre', persona.nombre || '', { shouldDirty: true, shouldValidate: true });
  }

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
          const porDocumento = await comunidadApi.buscarPorDocumento(identificador);
          return porDocumento.data?.data?.persona?.nombre || '';
        } catch (_) {
          const porCarnet = await comunidadApi.buscarPorCarnet(identificador);
          return porCarnet.data?.data?.persona?.nombre || '';
        }
      }

      try {
        const porCarnet = await comunidadApi.buscarPorCarnet(identificador);
        return porCarnet.data?.data?.persona?.nombre || '';
      } catch (_) {
        const porDocumento = await comunidadApi.buscarPorDocumento(identificador);
        return porDocumento.data?.data?.persona?.nombre || '';
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
        ubicacion_prestamo: ubicacionPrestamo,
        equipos: equiposSeleccionados.map((eq) => String(eq._id)),
      });
      reset();
      setEquiposSeleccionados([]);
      setBarcodePrestamo('');
      setShowForm(false);
      showSuccess('Préstamo registrado correctamente');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 409) {
        showError(msg || 'Alguno de los equipos ya está en un préstamo activo');
      } else if (status === 404) {
        showError(msg || 'No se encontraron los equipos seleccionados');
      } else {
        showError(msg || 'No se pudo registrar el préstamo. Intente nuevamente.');
      }
    }
  }

  function devolverPorCodigoBarras(codigoEntrada = barcodeDevolucion) {
    if (!prestamoSeleccionado) return showWarning('Seleccione un préstamo');
    const codigo = String(codigoEntrada || '').trim();
    if (!codigo) return;

    const codigos = posiblesCodigos(codigo);

    // Excluir equipos ya en cola
    const yaEnCola = equipo => equiposParaDevolver.some(item => String(item.equipo.equipo_id) === String(equipo.equipo_id));
    const pendientesSinCola = pendientesSeleccionados.filter(eq => !yaEnCola(eq));

    const equipo = pendientesSinCola.find(
      (eq) => codigos.includes(String(eq.equipo_codigo_barras || '').toUpperCase())
    );

    if (!equipo) {
      if (pendientesSeleccionados.find(eq => codigos.includes(String(eq.equipo_codigo_barras || '').toUpperCase()))) {
        return showWarning('Ese equipo ya está en la cola de devolución');
      }
      return showWarning('Ese código no corresponde a un equipo pendiente de este préstamo');
    }

    setEquiposParaDevolver((prev) => [...prev, { equipo, novedad: { categoria: '', descripcion: '' } }]);
    setBarcodeDevolucion('');
    ultimoScanDevolucionRef.current = '';
    inputDevolucionRef.current?.focus();
  }

  async function confirmarDevoluciones() {
    if (!equiposParaDevolver.length) return;
    const total = equiposParaDevolver.length;
    try {
      for (const { equipo, novedad } of equiposParaDevolver) {
        const payload = {
          prestamo_id: String(prestamoSeleccionado._id),
          docente_codigo_nfc: prestamoSeleccionado.docente_codigo_nfc,
          docente_nombre: prestamoSeleccionado.docente_nombre,
          ubicacion_devolucion: ubicacionDevolucion,
          equipos: [String(equipo.equipo_id)],
        };
        if (novedad.categoria) payload.novedad = novedad;
        await devolver.mutateAsync(payload);
      }
      setEquiposParaDevolver([]);
      showSuccess(total > 1 ? `${total} equipos devueltos correctamente` : `${equiposParaDevolver[0]?.equipo.equipo_nombre || 'Equipo'} devuelto`);
    } catch (err) {
      showError(err.response?.data?.message || 'No se pudo confirmar la devolución. Intente nuevamente.');
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
    { key: 'ubicacion_prestamo', label: 'Ubicación', render: (v) => getUbicacionLabel(v) },
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6" />
            Préstamos de Equipos
          </h1>
          <p className="text-muted-foreground text-sm">{prestamos.length} abiertos</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo Préstamo'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 max-w-xl">
          <h2 className="font-semibold text-foreground mb-4">Registrar préstamo (tipo carrito)</h2>

          {/* Indicador NFC */}
          <div className={cn(
            'flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg',
            enCola
              ? 'bg-warning/10 border border-warning/20 text-warning'
              : intencionActiva
                ? 'bg-success/10 border border-success/20 text-success'
                : 'bg-muted border border-border text-muted-foreground'
          )}>
            {enCola
              ? <Clock className="h-4 w-4" />
              : intencionActiva
                ? <CreditCard className="h-4 w-4" />
                : <Loader2 className="h-4 w-4 animate-spin" />}
            {enCola
              ? `En cola, posición ${posicionCola || '—'} — esperando lector...`
              : intencionActiva
                ? 'Lector listo — acerque el carnet del docente'
                : 'Conectando con lector NFC...'}
          </div>

          <form onSubmit={handleSubmit(onCrear)} className="space-y-3">
            <FormField label="Documento / Carnet Docente" required>
              <Input {...register('docente_codigo_nfc', { required: true })} />
              <p className="text-xs text-muted-foreground mt-1">
                {resolviendoDocente ? 'Buscando docente...' : 'Al digitar documento o carnet se completa el nombre automáticamente'}
              </p>
              <p className="text-xs text-muted-foreground">Atajo: F1 para buscar por nombre y completar documento.</p>
            </FormField>
            <FormField label="Nombre Docente" required>
              <Input
                {...register('docente_nombre', { required: true })}
                readOnly
                className="bg-muted"
              />
            </FormField>
            {opcionesPrestamoEquipos.length > 1 && (
              <FormField label="Ubicación del préstamo">
                <Select
                  value={ubicacionPrestamo}
                  onChange={(e) => setUbicacionPrestamo(e.target.value)}
                >
                  {opcionesPrestamoEquipos.map((ubicacion) => (
                    <option key={ubicacion.clave} value={ubicacion.clave}>
                      {getUbicacionLabel(ubicacion.clave)}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Escanear código de barras">
              <div className="flex gap-2">
                <Input
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
                />
                <Button type="button" onClick={agregarPorCodigoBarras}>
                  Agregar
                </Button>
              </div>
            </FormField>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Carrito de equipos</label>
              <div className="max-h-44 overflow-y-auto border border-border rounded-lg p-2 space-y-2">
                {equiposSeleccionados.map((eq) => (
                  <div key={String(eq._id)} className="flex items-center justify-between text-sm bg-muted rounded p-2">
                    <div>
                      <p className="font-medium text-foreground">{eq.nombre} - {eq.marca}</p>
                      <p className="text-muted-foreground text-xs">{eq.codigo_inventario} | {eq.codigo_barras}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarDelCarrito(eq._id)}
                      className="text-destructive hover:text-destructive/80 text-xs font-semibold"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                {!equiposSeleccionados.length && (
                  <p className="text-muted-foreground text-sm py-2 text-center">Escanee códigos para agregar equipos</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={crear.isPending} className="w-full">
              {crear.isPending ? 'Registrando...' : 'Registrar Préstamo'}
            </Button>
          </form>
        </div>
      )}

      {!showForm && <DataTable columns={columns} data={prestamos} loading={isLoading} searchable />}

      {prestamoSeleccionado && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-foreground">
              Devolución parcial por escaneo: {prestamoSeleccionado.docente_nombre}
            </h3>
            <button
              onClick={() => setPrestamoSeleccionadoId('')}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Cerrar
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            Documento/Carnet: <b className="text-foreground">{prestamoSeleccionado.docente_codigo_nfc}</b> | Pendientes: <b className="text-foreground">{pendientesSeleccionados.length}</b>
          </p>
          {opcionesPrestamoEquipos.length > 1 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Ubicación de devolución</p>
              <Select
                value={ubicacionDevolucion}
                onChange={(e) => setUbicacionDevolucion(e.target.value)}
              >
                {opcionesPrestamoEquipos.map((ubicacion) => (
                  <option key={ubicacion.clave} value={ubicacion.clave}>
                    {getUbicacionLabel(ubicacion.clave)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Escanear equipo para añadir a cola */}
          <div className="flex gap-2">
            <Input
              ref={inputDevolucionRef}
              value={barcodeDevolucion}
              onChange={(e) => setBarcodeDevolucion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  devolverPorCodigoBarras();
                }
              }}
              placeholder="Escanee código de barras del equipo"
            />
            <Button type="button" onClick={() => devolverPorCodigoBarras()}>
              Añadir
            </Button>
          </div>

          {/* Tabla de equipos pendientes (referencia) */}
          <div className="max-h-44 overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="table-header">Equipo pendiente</th>
                  <th className="table-header">Código de barras</th>
                </tr>
              </thead>
              <tbody>
                {pendientesSeleccionados
                  .filter(eq => !equiposParaDevolver.some(item => String(item.equipo.equipo_id) === String(eq.equipo_id)))
                  .map((eq) => (
                    <tr key={`${eq.equipo_id}-${eq.fecha_entrega || ''}`} className="border-t border-border">
                      <td className="table-cell">{eq.equipo_nombre}</td>
                      <td className="table-cell font-mono text-xs">{eq.equipo_codigo_barras || '—'}</td>
                    </tr>
                  ))}
                {pendientesSeleccionados.every(eq => equiposParaDevolver.some(item => String(item.equipo.equipo_id) === String(eq.equipo_id))) && (
                  <tr><td colSpan={2} className="table-cell text-center text-muted-foreground">Todos escaneados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cola de devolución con novedad por equipo */}
          {equiposParaDevolver.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Equipos a devolver ({equiposParaDevolver.length})</p>
              <div className="space-y-2">
                {equiposParaDevolver.map((item, idx) => (
                  <div key={String(item.equipo.equipo_id)} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{item.equipo.equipo_nombre}</p>
                      <button
                        type="button"
                        onClick={() => setEquiposParaDevolver(prev => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Quitar
                      </button>
                    </div>
                    <Select
                      value={item.novedad.categoria}
                      onChange={(e) => setEquiposParaDevolver(prev => prev.map((it, i) => i === idx ? { ...it, novedad: { ...it.novedad, categoria: e.target.value, descripcion: '' } } : it))}
                    >
                      <option value="">Sin novedad</option>
                      <option value="daño_fisico">Daño físico</option>
                      <option value="no_funciona">No funciona</option>
                      <option value="perdida">Pérdida</option>
                      <option value="otro">Otro</option>
                    </Select>
                    {item.novedad.categoria && (
                      <Input
                        value={item.novedad.descripcion}
                        onChange={(e) => setEquiposParaDevolver(prev => prev.map((it, i) => i === idx ? { ...it, novedad: { ...it.novedad, descripcion: e.target.value } } : it))}
                        placeholder="Descripción de la novedad..."
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="destructive"
                onClick={confirmarDevoluciones}
                disabled={devolver.isPending}
                className="w-full"
              >
                {devolver.isPending ? 'Procesando...' : `Confirmar devolución (${equiposParaDevolver.length} equipo${equiposParaDevolver.length > 1 ? 's' : ''})`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
