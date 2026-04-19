import { useState, useMemo } from 'react';
import {
  useReservas,
  useCrearReserva,
  useAprobarReserva,
  useRechazarReserva,
  useCancelarReserva,
  useDisponibilidad,
  reservasApi,
} from './reservasApi';
import { useBloques } from '@/features/bloques/bloquesApi';
import { useSalones } from '@/features/salones/salonesApi';
import { useAuthStore } from '@/features/auth/authStore';
import { comunidadApi } from '@/features/comunidad/comunidadApi';
import DataTable from '@/shared/components/DataTable';
import Swal from 'sweetalert2';
import { CalendarDays, Plus, Check, X, Search, Loader2 } from 'lucide-react';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import { ROLES } from '@/shared/constants';

const ESTADOS = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
  cancelada: { label: 'Cancelada', variant: 'default' },
  completada: { label: 'Completada', variant: 'success' },
};

export default function ReservasPage() {
  const [filters, setFilters] = useState({ estado: '', nombre_bloque: '', fecha: '' });
  const [showForm, setShowForm] = useState(false);
  const [buscandoSolicitante, setBuscandoSolicitante] = useState(false);
  const [solicitanteEncontrado, setSolicitanteEncontrado] = useState(null);
  const [form, setForm] = useState({
    nombre_bloque: '', nombre_salon: '', fecha: '',
    hora_inicio: '', hora_fin: '', motivo: '',
    solicitante_documento: '', solicitante_nombre: '',
  });

  const { data: reservas = [], isLoading } = useReservas(filters);
  const { data: bloques = [] } = useBloques();
  const { data: salones = [] } = useSalones();
  const crear = useCrearReserva();
  const aprobar = useAprobarReserva();
  const rechazar = useRechazarReserva();
  const cancelar = useCancelarReserva();
  const usuario = useAuthStore((s) => s.usuario);
  const isAdmin = usuario?.rol === ROLES.ADMIN;

  const { data: disponibilidad } = useDisponibilidad(form.nombre_salon, form.fecha);

  const salonesFiltrados = useMemo(
    () => form.nombre_bloque ? salones.filter((s) => s.nombre_bloque === form.nombre_bloque) : salones,
    [salones, form.nombre_bloque]
  );

  async function buscarSolicitante(identificador) {
    const id = String(identificador || '').trim();
    if (!id) return;
    setBuscandoSolicitante(true);
    setSolicitanteEncontrado(null);
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
      setSolicitanteEncontrado(persona);
      setForm((f) => ({
        ...f,
        solicitante_documento: persona.numero_documento || id,
        solicitante_nombre: persona.nombre || '',
      }));
    } catch {
      Swal.fire({ icon: 'warning', title: 'No encontrado', text: `No se encontró persona con "${id}". Puede ingresar el nombre manualmente.`, timer: 3000, showConfirmButton: false });
    } finally {
      setBuscandoSolicitante(false);
    }
  }

  async function handleCrear() {
    if (!form.nombre_salon || !form.fecha || !form.hora_inicio || !form.hora_fin) {
      Swal.fire({ icon: 'warning', title: 'Completa todos los campos obligatorios' });
      return;
    }
    // Pre-validar conflictos antes de crear
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
      setShowForm(false);
      setSolicitanteEncontrado(null);
      setForm({ nombre_bloque: '', nombre_salon: '', fecha: '', hora_inicio: '', hora_fin: '', motivo: '', solicitante_documento: '', solicitante_nombre: '' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message ?? 'No se pudo crear la reserva' });
    }
  }

  async function handleAprobar(id) {
    const r = await Swal.fire({ title: '¿Aprobar reserva?', icon: 'question', showCancelButton: true, confirmButtonText: 'Aprobar', confirmButtonColor: '#16a34a' });
    if (!r.isConfirmed) return;
    try {
      await aprobar.mutateAsync(id);
      Swal.fire({ icon: 'success', title: 'Aprobada', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message ?? 'Error' });
    }
  }

  async function handleRechazar(id) {
    const r = await Swal.fire({ title: '¿Rechazar reserva?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Rechazar', confirmButtonColor: '#dc2626' });
    if (!r.isConfirmed) return;
    try {
      await rechazar.mutateAsync(id);
      Swal.fire({ icon: 'success', title: 'Rechazada', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message ?? 'Error' });
    }
  }

  async function handleCancelar(id) {
    const r = await Swal.fire({ title: '¿Cancelar reserva?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Cancelar reserva', confirmButtonColor: '#6b7280' });
    if (!r.isConfirmed) return;
    try {
      await cancelar.mutateAsync(id);
      Swal.fire({ icon: 'success', title: 'Cancelada', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message ?? 'Error' });
    }
  }

  function handleSlotClick(slot) {
    if (!slot.disponible) return;
    if (!form.hora_inicio || (form.hora_inicio && form.hora_fin)) {
      setForm((f) => ({ ...f, hora_inicio: slot.hora, hora_fin: '' }));
    } else {
      if (slot.hora > form.hora_inicio) {
        // Calculate next slot after selected
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

  const COLS = [
    {
      key: 'fecha',
      label: 'Fecha',
      render: (v) => v ? new Date(v).toLocaleDateString('es-CO') : '—',
    },
    { key: 'nombre_salon', label: 'Salón' },
    { key: 'hora_inicio', label: 'Inicio' },
    { key: 'hora_fin', label: 'Fin' },
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
          {isAdmin && row.estado === 'pendiente' && (
            <>
              <button onClick={() => handleAprobar(row._id)} className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-950 text-green-600" title="Aprobar">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => handleRechazar(row._id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-500" title="Rechazar">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          {['pendiente', 'aprobada'].includes(row.estado) && (
            <button onClick={() => handleCancelar(row._id)} className="text-xs text-muted-foreground hover:text-foreground underline">
              Cancelar
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
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />{showForm ? 'Cerrar' : 'Nueva reserva'}
        </Button>
      </div>

      {/* Formulario nueva reserva */}
      {showForm && (
        <div className="bg-card border-2 border-primary/30 rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Nueva reserva</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Documento / Carnet solicitante">
              <div className="flex gap-1">
                <Input
                  value={form.solicitante_documento}
                  onChange={(e) => { setForm((f) => ({ ...f, solicitante_documento: e.target.value })); setSolicitanteEncontrado(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && buscarSolicitante(form.solicitante_documento)}
                  placeholder="Documento o carnet"
                />
                <button
                  type="button"
                  onClick={() => buscarSolicitante(form.solicitante_documento)}
                  disabled={buscandoSolicitante}
                  className="px-2 rounded border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
                  title="Buscar persona"
                >
                  {buscandoSolicitante
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
                  <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
            </FormField>
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
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Filtros */}
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
      />
    </div>
  );
}
