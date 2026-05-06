import { useState, useMemo, useEffect, useRef } from 'react';
import {
  useReservas,
  useCrearReserva,
  useCancelarReserva,
  useDisponibilidad,
  useSalonesDisponibles,
  reservasApi,
} from './reservasApi';
import { useBloques } from '@/features/bloques/bloquesApi';
import { useSalones } from '@/features/salones/salonesApi';
import { useAuthStore } from '@/features/auth/authStore';
import { comunidadApi } from '@/features/comunidad/comunidadApi';
import { useNFCSocket } from '@/features/nfc/useNFCSocket';
import { useNFCStore } from '@/features/nfc/nfcStore';
import { NFC_MODOS } from '@/shared/constants';
import DataTable from '@/shared/components/DataTable';
import Swal from 'sweetalert2';
import { CalendarDays, Plus, X, Search, Loader2, CreditCard, CheckCircle2, Clock, Sparkles, School, Users, Key } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/Sheet';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import { ROLES } from '@/shared/constants';
import { cn } from '@/shared/lib/utils';
import { abrirBuscadorPersonaPorNombre } from '@/shared/utils/personaSearchHotkey';

const HORAS = [];
for (let h = 7; h <= 22; h++) {
  HORAS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) HORAS.push(`${String(h).padStart(2, '0')}:30`);
}

const ESTADOS = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
  cancelada: { label: 'Cancelada', variant: 'neutral' },
  completada: { label: 'Cerrada', variant: 'orange' },
  no_reclamada: { label: 'No reclamada', variant: 'danger' },
};

export default function ReservasPage() {
  const [vista, setVista] = useState('reservas');
  const [filters, setFilters] = useState({ estado: '', nombre_bloque: '', fecha: '' });
  const [showForm, setShowForm] = useState(false);
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [buscarForm, setBuscarForm] = useState({ fecha: '', hora_inicio: '', hora_fin: '', tipo_silleteria: '', capacidad_min: '' });
  const [buscarParams, setBuscarParams] = useState(null);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);
  const [solicitanteEncontrado, setSolicitanteEncontrado] = useState(null);
  const [responsableEncontrado, setResponsableEncontrado] = useState(null);
  const [reservaDetalle, setReservaDetalle] = useState(null);
  const [form, setForm] = useState({
    nombre_bloque: '', nombre_salon: '', fecha: '',
    hora_inicio: '', hora_fin: '', motivo: '',
    solicitante_documento: '', solicitante_nombre: '',
    tipo_solicitante: 'docente',
    responsable_documento: '', responsable_nombre: '',
    entregar_llave: true,
  });

  const carnetProcesadoRef = useRef(null);

  const { data: reservas = [], isLoading } = useReservas(filters);
  const { data: bloques = [] } = useBloques();
  const { data: salones = [] } = useSalones();
  const crear = useCrearReserva();
  const cancelar = useCancelarReserva();
  const usuario = useAuthStore((s) => s.usuario);
  const isAdmin = usuario?.rol === ROLES.ADMIN;

  const { registrarIntencion, cancelarIntencion } = useNFCSocket();
  const ultimoCarnet = useNFCStore((s) => s.ultimoCarnet);
  const intencionActiva = useNFCStore((s) => s.intencionActiva);
  const enCola = useNFCStore((s) => s.enCola);
  const posicionCola = useNFCStore((s) => s.posicionCola);

  const { data: disponibilidad } = useDisponibilidad(form.nombre_salon, form.fecha);
  const { data: salonesLibres = [], isLoading: buscandoSalones } = useSalonesDisponibles(buscarParams);
  const objetivoEscaneo = useMemo(() => {
    if (!solicitanteEncontrado) return 'solicitante';
    if (form.tipo_solicitante === 'estudiante' && !responsableEncontrado) return 'responsable';
    return 'solicitante';
  }, [solicitanteEncontrado, responsableEncontrado, form.tipo_solicitante]);

  const tiposSilleteria = useMemo(() => [...new Set(salones.map((s) => s.tipo_silleteria).filter(Boolean))].sort(), [salones]);

  const salonesLibresFiltrados = useMemo(() => {
    return salonesLibres.filter((s) => {
      if (buscarForm.tipo_silleteria && s.tipo_silleteria !== buscarForm.tipo_silleteria) return false;
      if (buscarForm.capacidad_min && s.capacidad_estudiantes < Number(buscarForm.capacidad_min)) return false;
      return true;
    });
  }, [salonesLibres, buscarForm.tipo_silleteria, buscarForm.capacidad_min]);

  const porBloque = useMemo(() => {
    const map = {};
    salonesLibresFiltrados.forEach((s) => {
      const b = s.nombre_bloque || 'Sin bloque';
      if (!map[b]) map[b] = [];
      map[b].push(s);
    });
    return map;
  }, [salonesLibresFiltrados]);

  const salonesVista = bloqueSeleccionado ? (porBloque[bloqueSeleccionado] || []) : salonesLibresFiltrados;

  const salonesFiltrados = useMemo(
    () => form.nombre_bloque ? salones.filter((s) => s.nombre_bloque === form.nombre_bloque) : salones,
    [salones, form.nombre_bloque]
  );

  // Registrar intención NFC cuando el formulario está abierto
  useEffect(() => {
    if (showForm) {
      registrarIntencion(NFC_MODOS.IDENTIFICACION);
    } else {
      cancelarIntencion();
    }
    return () => cancelarIntencion();
  }, [showForm]);

  // Auto-buscar persona cuando NFC escanea carnet
  useEffect(() => {
    if (!ultimoCarnet || !showForm) return;
    const eventoCarnet = `${ultimoCarnet.timestamp || ''}:${ultimoCarnet.id_carnet || ''}`;
    if (carnetProcesadoRef.current === eventoCarnet) return;
    carnetProcesadoRef.current = eventoCarnet;
    buscarPersona(ultimoCarnet.id_carnet, objetivoEscaneo);
  }, [ultimoCarnet, showForm, objetivoEscaneo]);

  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (e) => {
      if (e.key !== 'F1') return;
      e.preventDefault();
      void handleBuscarPorNombre();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, objetivoEscaneo]);

  function aplicarPersonaEnFormulario(persona, objetivo, identificadorFallback = '') {
    if (!persona) return;
    const fallback = String(identificadorFallback || '').trim();
    if (objetivo === 'responsable') {
      setResponsableEncontrado(persona);
      setForm((f) => ({
        ...f,
        responsable_documento: persona.numero_documento || fallback,
        responsable_nombre: persona.nombre || '',
      }));
      return;
    }

    const tipoPersona = String(persona?.tipo || '').toLowerCase();
    const tipoSolicitante = ['docente', 'estudiante'].includes(tipoPersona) ? tipoPersona : 'docente';
    setSolicitanteEncontrado(persona);
    setForm((f) => ({
      ...f,
      solicitante_documento: persona.numero_documento || fallback,
      solicitante_nombre: persona.nombre || '',
      tipo_solicitante: tipoSolicitante,
      responsable_documento: tipoSolicitante === 'estudiante' ? f.responsable_documento : '',
      responsable_nombre: tipoSolicitante === 'estudiante' ? f.responsable_nombre : '',
    }));
    if (tipoSolicitante !== 'estudiante') {
      setResponsableEncontrado(null);
    }
  }

  async function handleBuscarPorNombre() {
    const persona = await abrirBuscadorPersonaPorNombre({
      titulo: objetivoEscaneo === 'responsable' ? 'Buscar profesor responsable (F1)' : 'Buscar solicitante (F1)',
      tipo: objetivoEscaneo === 'responsable' ? 'docente' : undefined,
      placeholder: objetivoEscaneo === 'responsable' ? 'Nombre del profesor' : 'Nombre del solicitante',
    });
    if (!persona) return;
    aplicarPersonaEnFormulario(persona, objetivoEscaneo);
  }

  async function buscarPersona(identificador, objetivo = 'solicitante') {
    const id = String(identificador || '').trim();
    if (!id) return;
    setBuscandoPersona(true);
    if (objetivo === 'responsable') {
      setResponsableEncontrado(null);
    } else {
      setSolicitanteEncontrado(null);
    }
    try {
      let res;
      const esDocumento = /^\d+$/.test(id);
      if (esDocumento) {
        try { res = await comunidadApi.buscarPorDocumento(id); }
        catch (_) { res = await comunidadApi.buscarPorCarnet(id); }
      } else {
        try { res = await comunidadApi.buscarPorCarnet(id); }
        catch (_) { res = await comunidadApi.buscarPorDocumento(id); }
      }
      const persona = res.data.data.persona;
      aplicarPersonaEnFormulario(persona, objetivo, id);
    } catch {
      Swal.fire({ icon: 'warning', title: 'No encontrado', text: `No se encontró persona con "${id}". Puede ingresar el nombre manualmente.`, timer: 3000, showConfirmButton: false });
    } finally {
      setBuscandoPersona(false);
      if (showForm) registrarIntencion(NFC_MODOS.IDENTIFICACION);
    }
  }

  async function handleCrear() {
    const requiereResponsable = form.tipo_solicitante === 'estudiante';
    if (!form.solicitante_documento || !form.solicitante_nombre || !form.nombre_bloque || !form.nombre_salon || !form.fecha || !form.hora_inicio || !form.hora_fin) {
      Swal.fire({ icon: 'warning', title: 'Completa todos los campos obligatorios', text: 'Documento, nombre, bloque, salón, fecha y horario son requeridos.' });
      return;
    }
    if (requiereResponsable && (!form.responsable_documento || !form.responsable_nombre)) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta profesor responsable',
        text: 'Si el solicitante es estudiante, debes registrar NFC/documento y nombre del profesor responsable.',
      });
      return;
    }
    let forzar = false;
    try {
      const res = await reservasApi.validar({
        nombre_salon: form.nombre_salon,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
      });
      const { tiene_conflictos, conflictos } = res.data.data;
      if (tiene_conflictos) {
        const detalles = conflictos.map((c) => `• [${c.tipo}] ${c.detalle}`).join('<br/>');
        const confirm = await Swal.fire({
          icon: 'warning',
          title: 'Conflictos detectados',
          html: `<p class="text-sm text-left mb-2">El horario seleccionado tiene solapamientos:</p>${detalles}`,
          showCancelButton: true,
          confirmButtonText: 'Crear de todas formas',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#d97706',
        });
        if (!confirm.isConfirmed) return;
        forzar = true;
      }
    } catch {
      // Si el endpoint falla, continuar sin forzar
    }
    try {
      await crear.mutateAsync({ ...form, forzar });
      Swal.fire({ icon: 'success', title: 'Reserva creada', timer: 1500, showConfirmButton: false });
      cerrarForm();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message ?? 'No se pudo crear la reserva' });
    }
  }

  async function handleCancelar(row) {
    const tieneLlaveEntregada = Boolean(row?.llave_entregada);
    const r = await Swal.fire({
      title: tieneLlaveEntregada ? '¿Cancelar reserva con llave entregada?' : '¿Cancelar reserva?',
      icon: 'warning',
      html: tieneLlaveEntregada
        ? '<p class="text-sm">Este docente ya recibió la llave. Si continúas, se cancelará la reserva y se registrará la devolución en historial con fecha/hora actual (oficina).</p>'
        : undefined,
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
    });
    if (!r.isConfirmed) return;
    try {
      const resp = await cancelar.mutateAsync(String(row._id || row.id));
      const devolucionAuto = Boolean(resp?.data?.data?.devolucion_automatica_registrada);
      Swal.fire({
        icon: 'success',
        title: devolucionAuto ? 'Reserva cancelada y llave devuelta' : 'Reserva cancelada',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message ?? 'Error' });
    }
  }

  function handleReservarDesdeResultado(salon) {
    setForm((f) => ({
      ...f,
      nombre_bloque: salon.nombre_bloque || '',
      nombre_salon: salon.nombre_salon || '',
      fecha: buscarParams?.fecha || '',
      hora_inicio: buscarParams?.hora_inicio || '',
      hora_fin: buscarParams?.hora_fin || '',
    }));
    setVista('reservas');
    setShowForm(true);
  }

  function cerrarForm() {
    setShowForm(false);
    setSolicitanteEncontrado(null);
    setResponsableEncontrado(null);
    carnetProcesadoRef.current = null;
    setForm({
      nombre_bloque: '',
      nombre_salon: '',
      fecha: '',
      hora_inicio: '',
      hora_fin: '',
      motivo: '',
      solicitante_documento: '',
      solicitante_nombre: '',
      tipo_solicitante: 'docente',
      responsable_documento: '',
      responsable_nombre: '',
      entregar_llave: true,
    });
  }

  function handleSlotClick(slot) {
    if (!slot.disponible) return;
    if (!form.hora_inicio || (form.hora_inicio && form.hora_fin)) {
      setForm((f) => ({ ...f, hora_inicio: slot.hora, hora_fin: '' }));
    } else {
      if (slot.hora > form.hora_inicio) {
        const [h, m] = slot.hora.split(':').map(Number);
        const nextHora = m === 0 ? `${String(h).padStart(2, '0')}:30` : `${String(h + 1).padStart(2, '0')}:00`;
        setForm((f) => ({ ...f, hora_fin: nextHora }));
      } else {
        setForm((f) => ({ ...f, hora_inicio: slot.hora, hora_fin: '' }));
      }
    }
  }

  function isSlotInRange(slotHora) {
    if (!form.hora_inicio) return false;
    if (form.hora_fin) return slotHora >= form.hora_inicio && slotHora < form.hora_fin;
    return slotHora === form.hora_inicio;
  }

  function puedeCancelarReserva(row) {
    if (!row || !['pendiente', 'aprobada'].includes(row.estado)) return false;
    if (!row.fecha || !row.hora_inicio) return false;

    const fecha = new Date(row.fecha);
    if (Number.isNaN(fecha.getTime())) return false;

    const yyyy = String(fecha.getFullYear());
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    const fechaInicio = new Date(`${yyyy}-${mm}-${dd}T${row.hora_inicio}:00`);
    if (Number.isNaN(fechaInicio.getTime())) return false;

    return new Date() < fechaInicio;
  }

  const COLS = [
    {
      key: 'fecha',
      label: 'Fecha',
      render: (v) => v ? new Date(v).toLocaleDateString('es-CO') : '—',
    },
    { key: 'nombre_salon', label: 'Salón' },
    {
      key: 'hora_inicio',
      label: 'Horario',
      render: (v, row) => v && row.hora_fin ? `${v} - ${row.hora_fin}` : v || '—',
    },
    { key: 'solicitante_nombre', label: 'Solicitante' },
    { key: 'motivo', label: 'Motivo', render: (v) => v || '—' },
    {
      key: 'estado',
      label: 'Estado',
      render: (v) => {
        const { label, variant } = ESTADOS[v] || { label: v, variant: 'default' };
        return <StatusBadge variant={variant}>{label}</StatusBadge>;
      },
    },
    {
      key: '_acciones',
      label: 'Acciones',
      render: (_, row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {puedeCancelarReserva(row) && (
            <button
              onClick={() => handleCancelar(row)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="h-3 w-3" />Cancelar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Reservas de Salones
          </h1>
          <p className="text-muted-foreground text-sm">{reservas.length} reservas</p>
        </div>
        {vista === 'reservas' && (
          <Button onClick={() => showForm ? cerrarForm() : setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />{showForm ? 'Cerrar' : 'Nueva reserva'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[
          { id: 'reservas', label: 'Reservas', icon: CalendarDays },
          { id: 'buscar', label: 'Buscar salón disponible', icon: Sparkles },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              vista === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Vista: Buscar salón disponible */}
      {vista === 'buscar' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              ¿Qué espacio necesitas?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <FormField label="Fecha">
                <Input
                  type="date"
                  value={buscarForm.fecha}
                  onChange={(e) => setBuscarForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </FormField>
              <FormField label="Hora inicio">
                <Select
                  value={buscarForm.hora_inicio}
                  onChange={(e) => setBuscarForm((f) => ({ ...f, hora_inicio: e.target.value, hora_fin: '' }))}
                >
                  <option value="">Seleccionar</option>
                  {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </FormField>
              <FormField label="Hora fin">
                <Select
                  value={buscarForm.hora_fin}
                  onChange={(e) => setBuscarForm((f) => ({ ...f, hora_fin: e.target.value }))}
                  disabled={!buscarForm.hora_inicio}
                >
                  <option value="">Seleccionar</option>
                  {HORAS.filter((h) => h > buscarForm.hora_inicio).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Tipo de silletería">
                <Select
                  value={buscarForm.tipo_silleteria}
                  onChange={(e) => setBuscarForm((f) => ({ ...f, tipo_silleteria: e.target.value }))}
                >
                  <option value="">Cualquiera</option>
                  {tiposSilleteria.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Capacidad mínima">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={buscarForm.capacidad_min}
                  onChange={(e) => setBuscarForm((f) => ({ ...f, capacidad_min: e.target.value }))}
                  placeholder="Ej: 30"
                />
              </FormField>
            </div>
            <Button
              onClick={() => {
                setBuscarParams({ fecha: buscarForm.fecha, hora_inicio: buscarForm.hora_inicio, hora_fin: buscarForm.hora_fin });
                setBloqueSeleccionado(null);
              }}
              disabled={!buscarForm.fecha || !buscarForm.hora_inicio || !buscarForm.hora_fin || buscandoSalones}
            >
              {buscandoSalones ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Buscando...</> : <><Search className="h-4 w-4 mr-1" />Buscar salones libres</>}
            </Button>
          </div>

          {buscarParams && !buscandoSalones && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {salonesLibresFiltrados.length === 0
                  ? `Sin salones disponibles con los criterios indicados`
                  : `${salonesLibresFiltrados.length} salón${salonesLibresFiltrados.length !== 1 ? 'es' : ''} disponible${salonesLibresFiltrados.length !== 1 ? 's' : ''} — ${buscarParams.fecha}, ${buscarParams.hora_inicio}–${buscarParams.hora_fin}`}
              </p>

              {salonesLibresFiltrados.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setBloqueSeleccionado(null)}
                    className={cn('px-3 py-1 text-sm rounded-full border transition-colors',
                      bloqueSeleccionado === null
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground')}
                  >
                    Todos ({salonesLibresFiltrados.length})
                  </button>
                  {Object.entries(porBloque).sort(([a], [b]) => a.localeCompare(b)).map(([bloque, list]) => (
                    <button
                      key={bloque}
                      onClick={() => setBloqueSeleccionado(bloque)}
                      className={cn('px-3 py-1 text-sm rounded-full border transition-colors',
                        bloqueSeleccionado === bloque
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground')}
                    >
                      Bloque {bloque} ({list.length})
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {salonesVista.map((salon) => (
                  <div
                    key={salon.nombre_salon}
                    className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <School className="h-4 w-4 text-primary shrink-0" />
                          {salon.nombre_salon}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Bloque {salon.nombre_bloque}</p>
                      </div>
                      <StatusBadge variant="success">Libre</StatusBadge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{salon.capacidad_estudiantes} estudiantes</span>
                      <span>{salon.tipo_silleteria}</span>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => handleReservarDesdeResultado(salon)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Reservar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Formulario nueva reserva */}
      {vista === 'reservas' && showForm && (
        <div className="bg-card border-2 border-primary/30 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Nueva reserva</h2>
          <p className="text-xs text-muted-foreground">Atajo: presiona F1 para buscar por nombre cuando no tengas documento o NFC.</p>

          {/* Indicador NFC */}
          <div className={cn(
            'flex items-center gap-2 text-sm px-3 py-2 rounded-lg border',
            (objetivoEscaneo === 'responsable' ? responsableEncontrado : solicitanteEncontrado)
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : enCola
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                : intencionActiva
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-muted border-border text-muted-foreground'
          )}>
            {(objetivoEscaneo === 'responsable' ? responsableEncontrado : solicitanteEncontrado)
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : enCola
                ? <Clock className="h-4 w-4 shrink-0" />
                : intencionActiva
                  ? <CreditCard className="h-4 w-4 shrink-0" />
                  : <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            {buscandoPersona
              ? 'Buscando...'
              : (objetivoEscaneo === 'responsable' ? responsableEncontrado : solicitanteEncontrado)
                ? `${objetivoEscaneo === 'responsable' ? 'Profesor responsable' : 'Solicitante'}: ${(objetivoEscaneo === 'responsable' ? responsableEncontrado : solicitanteEncontrado)?.nombre}`
                : enCola
                  ? `En cola, posición ${posicionCola || '—'} — esperando lector...`
                  : intencionActiva
                    ? `Lector listo — acerque el carnet de ${objetivoEscaneo === 'responsable' ? 'profesor responsable' : 'solicitante'}`
                    : 'Conectando con lector NFC...'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Documento / Carnet solicitante">
              <div className="flex gap-1">
                <Input
                  value={form.solicitante_documento}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      solicitante_documento: e.target.value,
                      solicitante_nombre: '',
                      tipo_solicitante: 'docente',
                      responsable_documento: '',
                      responsable_nombre: '',
                    }));
                    setSolicitanteEncontrado(null);
                    setResponsableEncontrado(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPersona(form.solicitante_documento, 'solicitante')}
                  placeholder="Escanee carnet o escriba documento"
                  readOnly={!!solicitanteEncontrado}
                  className={solicitanteEncontrado ? 'bg-muted/50 cursor-default' : ''}
                />
                <button
                  type="button"
                  onClick={() => buscarPersona(form.solicitante_documento, 'solicitante')}
                  disabled={buscandoPersona || !!solicitanteEncontrado}
                  className="px-2 rounded border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
                  title="Buscar persona"
                >
                  {buscandoPersona
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Search className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <FormField label="Nombre solicitante">
              <div className="relative">
                <Input
                  value={form.solicitante_nombre}
                  onChange={(e) => setForm((f) => ({ ...f, solicitante_nombre: e.target.value }))}
                  placeholder="Nombre completo"
                  readOnly={!!solicitanteEncontrado}
                  className={solicitanteEncontrado ? 'bg-muted/50 cursor-default' : ''}
                />
                {solicitanteEncontrado && (
                  <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
            </FormField>
            {form.tipo_solicitante === 'estudiante' && (
              <>
                <FormField label="NFC / Documento profesor responsable">
                  <div className="flex gap-1">
                    <Input
                      value={form.responsable_documento}
                      onChange={(e) => { setForm((f) => ({ ...f, responsable_documento: e.target.value })); setResponsableEncontrado(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && buscarPersona(form.responsable_documento, 'responsable')}
                      placeholder="Escanee NFC o escriba documento"
                    />
                    <button
                      type="button"
                      onClick={() => buscarPersona(form.responsable_documento, 'responsable')}
                      disabled={buscandoPersona}
                      className="px-2 rounded border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
                      title="Buscar profesor responsable"
                    >
                      {buscandoPersona
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>
                <FormField label="Nombre profesor responsable">
                  <div className="relative">
                    <Input
                      value={form.responsable_nombre}
                      onChange={(e) => setForm((f) => ({ ...f, responsable_nombre: e.target.value }))}
                      placeholder="Nombre del profesor responsable"
                      readOnly={!!responsableEncontrado}
                      className={responsableEncontrado ? 'bg-muted/50 cursor-default' : ''}
                    />
                    {responsableEncontrado && (
                      <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                </FormField>
              </>
            )}
            <FormField label="Bloque">
              <Select
                value={form.nombre_bloque}
                onChange={(e) => setForm((f) => ({ ...f, nombre_bloque: e.target.value, nombre_salon: '' }))}
              >
                <option value="">Seleccionar bloque</option>
                {bloques.map((b) => (
                  <option key={b.nombre_bloque} value={b.nombre_bloque}>{b.nombre_bloque}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Salón">
              <Select
                value={form.nombre_salon}
                onChange={(e) => setForm((f) => ({ ...f, nombre_salon: e.target.value }))}
                disabled={!form.nombre_bloque}
              >
                <option value="">Seleccionar salón</option>
                {salonesFiltrados.map((s) => (
                  <option key={s.nombre_salon} value={s.nombre_salon}>{s.nombre_salon}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Fecha">
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </FormField>
            <FormField label="Motivo (opcional)">
              <Input
                value={form.motivo}
                onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                placeholder="Ej: Reunión, clase extra..."
              />
            </FormField>
            <FormField label="Entrega de llave al momento">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, entregar_llave: !f.entregar_llave }))}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors w-full',
                  form.entregar_llave
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                <span className={cn('w-8 h-4 rounded-full transition-colors relative shrink-0', form.entregar_llave ? 'bg-primary' : 'bg-muted-foreground/30')}>
                  <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', form.entregar_llave ? 'left-4' : 'left-0.5')} />
                </span>
                {form.entregar_llave ? 'Sí, entregar llave ahora' : 'No — reclamará por NFC después'}
              </button>
            </FormField>
          </div>

          {/* Selector visual de horario */}
          {disponibilidad?.slots && (
            <div>
              <p className="text-sm font-semibold mb-2">
                Seleccionar horario — {form.hora_inicio ? `${form.hora_inicio}${form.hora_fin ? ` - ${form.hora_fin}` : ' (selecciona fin)'}` : 'clic para inicio'}
              </p>
              <div className="grid grid-cols-7 sm:grid-cols-10 lg:grid-cols-14 gap-1">
                {disponibilidad.slots.map((slot) => {
                  const selected = isSlotInRange(slot.hora);
                  return (
                    <button
                      key={slot.hora}
                      onClick={() => handleSlotClick(slot)}
                      disabled={!slot.disponible}
                      title={slot.disponible ? slot.hora : `${slot.hora} — ${slot.detalle || slot.motivo}`}
                      className={`
                        text-xs py-1.5 px-1 rounded border text-center transition-all
                        ${!slot.disponible
                          ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                          : selected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-card border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
                        }
                      `}
                    >
                      {slot.hora}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-card border border-border inline-block" /> Disponible</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Seleccionado</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted opacity-50 inline-block" /> Ocupado</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCrear} disabled={crear.isPending}>
              {crear.isPending ? 'Creando...' : 'Crear reserva'}
            </Button>
            <Button variant="outline" onClick={cerrarForm}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Vista: Lista de reservas */}
      {vista === 'reservas' && (
        <>
          <div className="bg-card border border-border rounded-lg p-4 flex gap-4 flex-wrap">
            <FormField label="Bloque">
              <Select
                value={filters.nombre_bloque}
                onChange={(e) => setFilters((f) => ({ ...f, nombre_bloque: e.target.value }))}
              >
                <option value="">Todos</option>
                {bloques.map((b) => (
                  <option key={b.nombre_bloque} value={b.nombre_bloque}>{b.nombre_bloque}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Estado">
              <Select
                value={filters.estado}
                onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="cancelada">Cancelada</option>
                <option value="completada">Cerrada</option>
                <option value="no_reclamada">No reclamada</option>
              </Select>
            </FormField>
            <FormField label="Fecha">
              <Input
                type="date"
                value={filters.fecha}
                onChange={(e) => setFilters((f) => ({ ...f, fecha: e.target.value }))}
              />
            </FormField>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ estado: '', nombre_bloque: '', fecha: '' })}
                className="text-sm text-muted-foreground hover:text-foreground underline pb-1"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          <DataTable
            columns={COLS}
            data={reservas}
            loading={isLoading}
            searchable
            onRowDoubleClick={(row) => setReservaDetalle(row)}
          />
        </>
      )}
      {/* Sheet detalle de reserva */}
      <Sheet open={!!reservaDetalle} onOpenChange={(open) => { if (!open) setReservaDetalle(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {reservaDetalle && (() => {
            const { label, variant } = ESTADOS[reservaDetalle.estado] || { label: reservaDetalle.estado, variant: 'default' };
            const fecha = reservaDetalle.fecha ? new Date(reservaDetalle.fecha).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
            const creado = reservaDetalle.createdAt ? new Date(reservaDetalle.createdAt).toLocaleString('es-CO') : '—';
            return (
              <>
                <SheetHeader className="mb-6">
                  <SheetTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Detalle de reserva
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-5">
                  {/* Estado */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado</span>
                    <StatusBadge variant={variant}>{label}</StatusBadge>
                  </div>

                  {/* Salón y bloque */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Espacio</p>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <School className="h-4 w-4 text-primary shrink-0" />
                      {reservaDetalle.nombre_salon || '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">Bloque {reservaDetalle.nombre_bloque || '—'}</p>
                  </div>

                  {/* Fecha y horario */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Fecha y horario</p>
                    <p className="font-medium text-foreground capitalize">{fecha}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {reservaDetalle.hora_inicio} – {reservaDetalle.hora_fin}
                    </p>
                  </div>

                  {/* Solicitante */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Solicitante</p>
                    <p className="font-medium text-foreground">{reservaDetalle.solicitante_nombre || '—'}</p>
                    <p className="text-sm text-muted-foreground">Doc: {reservaDetalle.solicitante_documento || '—'}</p>
                    {reservaDetalle.tipo_solicitante && (
                      <p className="text-sm text-muted-foreground capitalize">Tipo: {reservaDetalle.tipo_solicitante}</p>
                    )}
                  </div>

                  {/* Llave */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" /> Llave
                    </p>
                    <p className="text-sm text-foreground">
                      {reservaDetalle.entregar_llave === false
                        ? 'Reclama por NFC'
                        : 'Entrega inmediata al reservar'}
                    </p>
                    <p className={cn('text-sm font-medium', reservaDetalle.llave_entregada ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
                      {reservaDetalle.llave_entregada ? '✓ Llave entregada' : 'Llave no entregada aún'}
                    </p>
                  </div>

                  {/* Motivo */}
                  {reservaDetalle.motivo && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Motivo</p>
                      <p className="text-sm text-foreground">{reservaDetalle.motivo}</p>
                    </div>
                  )}

                  {/* Responsable */}
                  {(reservaDetalle.responsable_nombre || reservaDetalle.responsable_documento) && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Responsable</p>
                      <p className="text-sm text-foreground">{reservaDetalle.responsable_nombre || '—'}</p>
                      <p className="text-sm text-muted-foreground">Doc: {reservaDetalle.responsable_documento || '—'}</p>
                    </div>
                  )}

                  {/* Admin info */}
                  {(reservaDetalle.aprobado_por || reservaDetalle.creado_por_rol) && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Gestión</p>
                      {reservaDetalle.aprobado_por && <p className="text-sm text-foreground">Aprobado/rechazado por: {reservaDetalle.aprobado_por}</p>}
                      {reservaDetalle.creado_por_rol && <p className="text-sm text-muted-foreground">Creado por rol: {reservaDetalle.creado_por_rol}</p>}
                    </div>
                  )}

                  {/* Registro */}
                  <p className="text-xs text-muted-foreground text-right">Registrada: {creado}</p>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
