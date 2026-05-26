import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import DataTable from '@/shared/components/DataTable';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Button from '@/shared/components/ui/Button';
import { FormField, Textarea } from '@/shared/components/ui/FormField';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/shared/components/ui/Sheet';
import { useTodosPendientes } from '@/features/llaves/llavesApi';
import {
  useEnviarNotificacion,
  useEnviarNotificacionReservas,
  useReservasNoReclamadas,
} from '../notificacionesApi';
import { showSuccess, showError } from '@/shared/utils/alert';
import Swal from 'sweetalert2';
import { AlertTriangle, Mail, Send, Key, CalendarX } from 'lucide-react';

const ASUNTO_LLAVE_DEFAULT = 'Recordatorio de devolución de llave - AulaSync';
const ASUNTO_RESERVA_DEFAULT = 'Reserva cerrada — Llave no reclamada - AulaSync';

function calcularTiempoTranscurrido(fechaEntrega, horario) {
  if (!fechaEntrega || !horario) return '—';
  const partes = horario.toUpperCase().split(' A ');
  if (partes.length < 2) return '—';
  const horaFin = partes[1].trim();
  const ahora = dayjs();
  const finClase = dayjs(`${fechaEntrega}T${horaFin}`);
  const diffTotal = ahora.diff(finClase, 'minute');
  if (diffTotal < 0) return 'En clase';
  const diffHoras = Math.floor(diffTotal / 60);
  const diffMinutos = diffTotal % 60;
  if (diffHoras >= 24) {
    const dias = Math.floor(diffHoras / 24);
    const horasRest = diffHoras % 24;
    return `${dias}d ${horasRest}h`;
  }
  return `${diffHoras}h ${diffMinutos}min`;
}

function esMora(estado) {
  return estado === 'demora_entrega' || estado === 'Demora en entrega';
}

/** Panel lateral compartido para redactar y enviar notificaciones (llaves o reservas) */
function ComposerSheet({ open, onOpenChange, destinatarios, mode, onEnviar, isPending }) {
  const asuntoDefault = mode === 'reservas' ? ASUNTO_RESERVA_DEFAULT : ASUNTO_LLAVE_DEFAULT;
  const [tipoMensaje, setTipoMensaje] = useState('predeterminado');
  const [asunto, setAsunto] = useState(asuntoDefault);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');

  function handleOpen(val) {
    if (val) {
      setTipoMensaje('predeterminado');
      setAsunto(asuntoDefault);
      setMensajePersonalizado('');
    }
    onOpenChange(val);
  }

  async function handleEnviar() {
    if (tipoMensaje === 'personalizado' && !mensajePersonalizado.trim()) {
      showError('Escriba un mensaje personalizado o seleccione el mensaje predeterminado');
      return;
    }
    const confirm = await Swal.fire({
      title: 'Confirmar envío',
      html: `<p>Se enviarán <b>${destinatarios.length}</b> notificación(es) por correo electrónico.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
    });
    if (!confirm.isConfirmed) return;
    onEnviar({ tipoMensaje, asunto, mensajePersonalizado });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === 'reservas' ? 'Notificar reserva sin reclamar' : 'Enviar notificación de devolución'}
          </SheetTitle>
          <SheetDescription>
            Se notificará a {destinatarios.length} destinatario(s) por correo electrónico.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Destinatarios */}
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Destinatarios ({destinatarios.length})
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {destinatarios.map((d) => (
                <div key={d._id} className="text-sm text-foreground flex justify-between">
                  <span>{d.solicitante_nombre ?? d.docente}</span>
                  <span className="text-muted-foreground text-xs">{d.correo ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de mensaje */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Tipo de mensaje</p>
            <div className="flex gap-2">
              {[
                { value: 'predeterminado', label: 'Predeterminado' },
                { value: 'personalizado', label: 'Personalizado' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTipoMensaje(opt.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                    tipoMensaje === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asunto */}
          <FormField label="Asunto">
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>

          {/* Cuerpo */}
          {tipoMensaje === 'predeterminado' ? (
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Vista previa</p>
              {mode === 'reservas' ? (
                <p>Se informará que la reserva ha cerrado y no se registró la entrega de la llave.</p>
              ) : (
                <p>Se recordará al docente que tiene una llave pendiente de devolución.</p>
              )}
              <p className="text-xs italic">Los datos específicos de cada destinatario se completarán automáticamente.</p>
            </div>
          ) : (
            <FormField label="Mensaje personalizado">
              <Textarea
                value={mensajePersonalizado}
                onChange={(e) => setMensajePersonalizado(e.target.value)}
                placeholder="Escriba aquí su mensaje..."
                rows={6}
              />
            </FormField>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleEnviar} disabled={isPending}>
            {isPending ? 'Enviando...' : (
              <><Send className="h-4 w-4 mr-1.5" />Enviar notificación</>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function EnviarTab() {
  // ── Llaves ───────────────────────────────────────────────────────────────
  const { data: pendientes = [], isLoading: loadingLlaves } = useTodosPendientes();
  const enviarLlavesMutation = useEnviarNotificacion();
  const [seleccionadosLlaves, setSeleccionadosLlaves] = useState({});
  const [sheetMode, setSheetMode] = useState('llaves');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [destinatariosSheet, setDestinatariosSheet] = useState([]);

  // ── Reservas sin reclamar ─────────────────────────────────────────────────
  const { data: reservasNoReclamadas = [], isLoading: loadingReservas } = useReservasNoReclamadas();
  const enviarReservasMutation = useEnviarNotificacionReservas();
  const [seleccionadosReservas, setSeleccionadosReservas] = useState({});

  // ── Helpers de selección ──────────────────────────────────────────────────
  const selLlavesCount = Object.values(seleccionadosLlaves).filter(Boolean).length;
  const selLlavesList = useMemo(
    () => pendientes.filter((p) => seleccionadosLlaves[p._id]),
    [pendientes, seleccionadosLlaves],
  );
  const todosLlavesSeleccionados =
    pendientes.length > 0 && pendientes.filter((p) => p.correo).every((p) => seleccionadosLlaves[p._id]);

  const selReservasCount = Object.values(seleccionadosReservas).filter(Boolean).length;
  const selReservasList = useMemo(
    () => reservasNoReclamadas.filter((r) => seleccionadosReservas[r._id]),
    [reservasNoReclamadas, seleccionadosReservas],
  );
  const todosReservasSeleccionados =
    reservasNoReclamadas.length > 0 && reservasNoReclamadas.every((r) => seleccionadosReservas[r._id]);

  function toggleLlave(id) { setSeleccionadosLlaves((p) => ({ ...p, [id]: !p[id] })); }
  function toggleTodosLlaves() {
    if (todosLlavesSeleccionados) { setSeleccionadosLlaves({}); return; }
    const next = {};
    pendientes.forEach((p) => { if (p.correo) next[p._id] = true; });
    setSeleccionadosLlaves(next);
  }
  function toggleReserva(id) { setSeleccionadosReservas((p) => ({ ...p, [id]: !p[id] })); }
  function toggleTodosReservas() {
    if (todosReservasSeleccionados) { setSeleccionadosReservas({}); return; }
    const next = {};
    reservasNoReclamadas.forEach((r) => { next[r._id] = true; });
    setSeleccionadosReservas(next);
  }

  // ── Abrir Sheet ───────────────────────────────────────────────────────────
  function abrirSheetLlave(rows) {
    setSheetMode('llaves');
    setDestinatariosSheet(rows);
    setSheetOpen(true);
  }
  function abrirSheetReserva(rows) {
    setSheetMode('reservas');
    setDestinatariosSheet(rows);
    setSheetOpen(true);
  }

  // ── Enviar ────────────────────────────────────────────────────────────────
  async function onEnviarLlaves({ tipoMensaje, asunto, mensajePersonalizado }) {
    const sinCorreo = destinatariosSheet.filter((p) => !p.correo);
    if (sinCorreo.length) { showError('Algunos destinatarios no tienen correo registrado'); return; }

    const payload = {
      destinatarios: destinatariosSheet.map((p) => ({
        nombre: p.docente,
        documento: p.documento,
        correo: p.correo,
        salon: p.aula,
        fecha_prestamo: p.fechaEntrega && p.horaEntrega ? `${p.fechaEntrega}T${p.horaEntrega}` : p.fechaEntrega || '',
        tiempo_transcurrido: calcularTiempoTranscurrido(p.fechaEntrega, p.horario),
        llave_id: p._id,
      })),
      tipo_mensaje: tipoMensaje,
      mensaje_personalizado: tipoMensaje === 'personalizado' ? mensajePersonalizado : '',
      asunto,
    };
    try {
      const res = await enviarLlavesMutation.mutateAsync(payload);
      const data = res.data?.data;
      showSuccess(`Enviados: ${data?.enviados || 0} de ${data?.total || 0}${data?.fallidos ? ` (${data.fallidos} fallidos)` : ''}`);
      setSheetOpen(false);
      setSeleccionadosLlaves({});
    } catch (err) {
      showError(err.response?.data?.message || 'Error al enviar notificaciones');
    }
  }

  async function onEnviarReservas({ tipoMensaje, asunto, mensajePersonalizado }) {
    const payload = {
      reserva_ids: destinatariosSheet.map((r) => r._id),
      tipo_mensaje: tipoMensaje,
      mensaje_personalizado: tipoMensaje === 'personalizado' ? mensajePersonalizado : '',
      asunto,
    };
    try {
      const res = await enviarReservasMutation.mutateAsync(payload);
      const data = res.data?.data;
      const msg = [`Enviados: ${data?.enviados || 0} de ${data?.total || 0}`];
      if (data?.fallidos) msg.push(`${data.fallidos} fallidos`);
      if (data?.sin_correo) msg.push(`${data.sin_correo} sin correo`);
      showSuccess(msg.join(' · '));
      setSheetOpen(false);
      setSeleccionadosReservas({});
    } catch (err) {
      showError(err.response?.data?.message || 'Error al enviar notificaciones');
    }
  }

  // ── Columnas llaves ───────────────────────────────────────────────────────
  const columnasLlaves = [
    {
      key: '_sel',
      label: (
        <input type="checkbox" checked={todosLlavesSeleccionados} onChange={toggleTodosLlaves}
          className="h-4 w-4 rounded border-border accent-primary" />
      ),
      render: (_, row) => (
        <input type="checkbox" checked={!!seleccionadosLlaves[row._id]}
          onChange={(e) => { e.stopPropagation(); toggleLlave(row._id); }}
          disabled={!row.correo}
          className="h-4 w-4 rounded border-border accent-primary disabled:opacity-40" />
      ),
    },
    { key: 'docente', label: 'Docente / Responsable' },
    {
      key: 'correo',
      label: 'Correo',
      render: (v) => v
        ? <span className="text-sm">{v}</span>
        : <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />Sin correo
          </span>,
    },
    { key: 'aula', label: 'Salón' },
    {
      key: '_tiempo',
      label: 'Tiempo transcurrido',
      render: (_, row) => calcularTiempoTranscurrido(row.fechaEntrega, row.horario),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (v) => (
        <StatusBadge variant={esMora(v) ? 'danger' : 'warning'}>
          {esMora(v) ? 'En mora' : 'En préstamo'}
        </StatusBadge>
      ),
    },
  ];

  // ── Columnas reservas ─────────────────────────────────────────────────────
  const columnasReservas = [
    {
      key: '_sel',
      label: (
        <input type="checkbox" checked={todosReservasSeleccionados} onChange={toggleTodosReservas}
          className="h-4 w-4 rounded border-border accent-primary" />
      ),
      render: (_, row) => (
        <input type="checkbox" checked={!!seleccionadosReservas[row._id]}
          onChange={(e) => { e.stopPropagation(); toggleReserva(row._id); }}
          className="h-4 w-4 rounded border-border accent-primary" />
      ),
    },
    { key: 'solicitante_nombre', label: 'Solicitante' },
    { key: 'solicitante_documento', label: 'Documento' },
    { key: 'nombre_salon', label: 'Salón' },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (v) => v ? new Date(v).toLocaleDateString('es-CO') : '—',
    },
    {
      key: '_horario',
      label: 'Horario',
      render: (_, row) => row.hora_inicio && row.hora_fin ? `${row.hora_inicio} – ${row.hora_fin}` : '—',
    },
  ];

  const isPending = enviarLlavesMutation.isPending || enviarReservasMutation.isPending;

  return (
    <div className="space-y-8">
      {/* ── Sección: Préstamos de llaves ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-base text-foreground">Préstamos de llaves pendientes</h2>
            {pendientes.length > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
                {pendientes.length}
              </span>
            )}
          </div>
          {selLlavesCount > 1 && (
            <Button onClick={() => abrirSheetLlave(selLlavesList)}>
              <Mail className="h-4 w-4 mr-1.5" />
              Notificar ({selLlavesCount})
            </Button>
          )}
        </div>

        <DataTable
          columns={columnasLlaves}
          data={pendientes}
          loading={loadingLlaves}
          searchable
          onRowClick={(row) => {
            if (!row.correo) { showError('Este docente no tiene correo electrónico registrado'); return; }
            abrirSheetLlave([row]);
          }}
          emptyMessage="No hay préstamos de llaves pendientes"
        />
      </section>

      {/* ── Sección: Reservas sin reclamar ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarX className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-base text-foreground">Reservas sin reclamar</h2>
            {reservasNoReclamadas.length > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
                {reservasNoReclamadas.length}
              </span>
            )}
          </div>
          {selReservasCount > 0 && (
            <Button onClick={() => abrirSheetReserva(selReservasList)}>
              <Mail className="h-4 w-4 mr-1.5" />
              Notificar ({selReservasCount})
            </Button>
          )}
        </div>

        <DataTable
          columns={columnasReservas}
          data={reservasNoReclamadas}
          loading={loadingReservas}
          searchable
          onRowClick={(row) => abrirSheetReserva([row])}
          emptyMessage="No hay reservas sin reclamar"
        />
      </section>

      {/* ── Sheet compartido ── */}
      <ComposerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        destinatarios={destinatariosSheet}
        mode={sheetMode}
        onEnviar={sheetMode === 'llaves' ? onEnviarLlaves : onEnviarReservas}
        isPending={isPending}
      />
    </div>
  );
}


const ASUNTO_DEFAULT = 'Recordatorio de devolución de llave - AulaSync';

function calcularTiempoTranscurrido(fechaEntrega, horario) {
  if (!fechaEntrega || !horario) return '—';
  const partes = horario.toUpperCase().split(' A ');
  if (partes.length < 2) return '—';
  const horaFin = partes[1].trim();
  const ahora = dayjs();
  const finClase = dayjs(`${fechaEntrega}T${horaFin}`);
  const diffTotal = ahora.diff(finClase, 'minute');
  if (diffTotal < 0) return 'En clase';
  const diffHoras = Math.floor(diffTotal / 60);
  const diffMinutos = diffTotal % 60;
  if (diffHoras >= 24) {
    const dias = Math.floor(diffHoras / 24);
    const horasRest = diffHoras % 24;
    return `${dias}d ${horasRest}h`;
  }
  return `${diffHoras}h ${diffMinutos}min`;
}

function esMora(estado) {
  return estado === 'demora_entrega' || estado === 'Demora en entrega';
}

export default function EnviarTab() {
  const { data: pendientes = [], isLoading } = useTodosPendientes();
  const enviarMutation = useEnviarNotificacion();
  const [seleccionados, setSeleccionados] = useState({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [destinatariosSheet, setDestinatariosSheet] = useState([]);
  const [tipoMensaje, setTipoMensaje] = useState('predeterminado');
  const [asunto, setAsunto] = useState(ASUNTO_DEFAULT);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');

  const seleccionadosCount = Object.values(seleccionados).filter(Boolean).length;
  const seleccionadosList = useMemo(
    () => pendientes.filter((p) => seleccionados[p._id]),
    [pendientes, seleccionados]
  );

  const todosSeleccionados = pendientes.length > 0
    && pendientes.filter((p) => p.correo).every((p) => seleccionados[p._id]);

  function toggleSeleccion(id) {
    setSeleccionados((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleTodos() {
    if (todosSeleccionados) {
      setSeleccionados({});
    } else {
      const next = {};
      pendientes.forEach((p) => {
        if (p.correo) next[p._id] = true;
      });
      setSeleccionados(next);
    }
  }

  function abrirSheet(destinatarios) {
    setDestinatariosSheet(destinatarios);
    setAsunto(ASUNTO_DEFAULT);
    setTipoMensaje('predeterminado');
    setMensajePersonalizado('');
    setSheetOpen(true);
  }

  function onRowClick(row) {
    if (!row.correo) {
      showError('Este docente no tiene correo electrónico registrado');
      return;
    }
    abrirSheet([row]);
  }

  function onNotificarMultiples() {
    abrirSheet(seleccionadosList);
  }

  async function onEnviar() {
    const sinCorreo = destinatariosSheet.filter((p) => !p.correo);
    if (sinCorreo.length > 0) {
      showError('Algunos destinatarios seleccionados no tienen correo registrado');
      return;
    }

    if (tipoMensaje === 'personalizado' && !mensajePersonalizado.trim()) {
      showError('Escriba un mensaje personalizado o seleccione el mensaje predeterminado');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Confirmar envío',
      html: `<p>Se enviarán <b>${destinatariosSheet.length}</b> notificación(es) por correo electrónico.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
    });
    if (!confirm.isConfirmed) return;

    const payload = {
      destinatarios: destinatariosSheet.map((p) => ({
        nombre: p.docente,
        documento: p.documento,
        correo: p.correo,
        salon: p.aula,
        fecha_prestamo: p.fechaEntrega && p.horaEntrega
          ? `${p.fechaEntrega}T${p.horaEntrega}`
          : p.fechaEntrega || '',
        tiempo_transcurrido: calcularTiempoTranscurrido(p.fechaEntrega, p.horario),
        llave_id: p._id,
      })),
      tipo_mensaje: tipoMensaje,
      mensaje_personalizado: tipoMensaje === 'personalizado' ? mensajePersonalizado : '',
      asunto,
    };

    try {
      const res = await enviarMutation.mutateAsync(payload);
      const data = res.data?.data;
      showSuccess(
        `Enviados: ${data?.enviados || 0} de ${data?.total || 0}${data?.fallidos ? ` (${data.fallidos} fallidos)` : ''}`
      );
      setSheetOpen(false);
      setSeleccionados({});
    } catch (err) {
      showError(err.response?.data?.message || 'Error al enviar notificaciones');
    }
  }

  const columns = [
    {
      key: '_seleccion',
      label: (
        <input
          type="checkbox"
          checked={todosSeleccionados}
          onChange={toggleTodos}
          className="h-4 w-4 rounded border-border accent-primary"
        />
      ),
      render: (_, row) => (
        <input
          type="checkbox"
          checked={!!seleccionados[row._id]}
          onChange={(e) => {
            e.stopPropagation();
            toggleSeleccion(row._id);
          }}
          disabled={!row.correo}
          className="h-4 w-4 rounded border-border accent-primary disabled:opacity-40"
        />
      ),
    },
    { key: 'docente', label: 'Docente' },
    { key: 'documento', label: 'Documento' },
    {
      key: 'correo',
      label: 'Correo',
      render: (v) =>
        v ? (
          <span className="text-sm">{v}</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" />
            Sin correo
          </span>
        ),
    },
    { key: 'aula', label: 'Salón' },
    {
      key: 'origenRegistro',
      label: 'Origen',
      render: (v) => (
        <StatusBadge variant={v === 'programacion' ? 'info' : 'neutral'}>
          {v === 'programacion' ? 'Programación' : 'Individual'}
        </StatusBadge>
      ),
    },
    { key: 'fechaEntrega', label: 'F. Préstamo' },
    {
      key: '_tiempo',
      label: 'Tiempo',
      render: (_, row) => calcularTiempoTranscurrido(row.fechaEntrega, row.horario),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (v) => (
        <StatusBadge variant={esMora(v) ? 'danger' : 'warning'}>
          {esMora(v) ? 'En mora' : 'En préstamo'}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {seleccionadosCount > 1 && (
        <div className="flex items-center justify-end">
          <Button onClick={onNotificarMultiples}>
            <Mail className="h-4 w-4 mr-1.5" />
            Notificar devolución ({seleccionadosCount})
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={pendientes}
        loading={isLoading}
        searchable
        onRowClick={onRowClick}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Enviar notificación de devolución</SheetTitle>
            <SheetDescription>
              Se notificará a {destinatariosSheet.length} destinatario(s) por correo electrónico.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Destinatarios ({destinatariosSheet.length})
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {destinatariosSheet.map((p) => (
                  <div key={p._id} className="text-sm text-foreground flex justify-between">
                    <span>{p.docente}</span>
                    <span className="text-muted-foreground text-xs">{p.correo}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Tipo de mensaje</p>
              <div className="flex gap-2">
                {[
                  { value: 'predeterminado', label: 'Predeterminado' },
                  { value: 'personalizado', label: 'Personalizado' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTipoMensaje(opt.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                      tipoMensaje === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <FormField label="Asunto">
              <input
                type="text"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            {tipoMensaje === 'predeterminado' ? (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Vista previa del mensaje</p>
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground leading-relaxed">
                  <p>Estimado/a <strong>[Nombre del docente]</strong>,</p>
                  <p className="mt-2">
                    Le informamos que actualmente tiene en su poder la llave del salón
                    <strong> [Salón]</strong>, la cual fue prestada el día <strong>[Fecha]</strong>.
                  </p>
                  <p className="mt-2">
                    Le solicitamos amablemente realizar la devolución de esta llave a la mayor brevedad posible.
                    El cumplimiento oportuno de los tiempos de devolución es fundamental para garantizar
                    la disponibilidad de los espacios y facilitar su uso por parte de otros docentes y usuarios
                    de la institución.
                  </p>
                  <p className="mt-2 text-xs italic">
                    Los datos específicos de cada docente se completarán automáticamente al enviar.
                  </p>
                </div>
              </div>
            ) : (
              <FormField label="Mensaje personalizado">
                <Textarea
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  placeholder="Escriba aquí su mensaje. Los datos del préstamo se incluirán automáticamente..."
                  rows={6}
                />
              </FormField>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onEnviar} disabled={enviarMutation.isPending}>
              {enviarMutation.isPending ? (
                'Enviando...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Enviar notificación
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
