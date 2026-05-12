import { useState, useMemo, useEffect, useRef } from 'react';
import {
  useCrearReservaSemestral,
  useDisponibilidadSemestral,
  useValidarConflictosSemestral,
  useSalonesDisponiblesSemestral,
  reservasSemestralesApi,
} from './reservasSemestralesApi';
import { useBloques } from '@/features/bloques/bloquesApi';
import { useSalones } from '@/features/salones/salonesApi';
import { comunidadApi } from '@/features/comunidad/comunidadApi';
import { useNFCSocket } from '@/features/nfc/useNFCSocket';
import { useNFCStore } from '@/features/nfc/nfcStore';
import { NFC_MODOS } from '@/shared/constants';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import {
  BookMarked, Plus, X, Search, Loader2, CreditCard,
  CheckCircle2, AlertTriangle, Clock, Sparkles, School, Users,
} from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import { cn } from '@/shared/lib/utils';
import { abrirBuscadorPersonaPorNombre } from '@/shared/utils/personaSearchHotkey';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const HORAS = [];
for (let h = 7; h < 22; h++) {
  HORAS.push(`${String(h).padStart(2, '0')}:00`);
  HORAS.push(`${String(h).padStart(2, '0')}:30`);
}

const HORAS_FIN = [];
for (let h = 7; h <= 22; h++) {
  if (h > 7) HORAS_FIN.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) HORAS_FIN.push(`${String(h).padStart(2, '0')}:30`);
}

const FORM_INICIAL = {
  solicitante_documento: '',
  solicitante_nombre: '',
  tipo_solicitante: 'docente',
  responsable_documento: '',
  responsable_nombre: '',
  nombre_bloque: '',
  nombre_salon: '',
  materia: '',
};

const FRANJA_INICIAL = { dia: '', hora_inicio: '', hora_fin: '' };

// ─────────────────────────────────────────────────────────────────────────────

function FranjaRow({ franja, index, onChange, onRemove, salonSeleccionado }) {
  const { data: disponibilidad, isFetching } = useDisponibilidadSemestral(
    franja.dia ? salonSeleccionado : null,
    franja.dia || null,
  );

  const validar = useValidarConflictosSemestral();

  const [conflicto, setConflicto] = useState(null);

  useEffect(() => {
    if (!franja.dia || !franja.hora_inicio || !franja.hora_fin || !salonSeleccionado) {
      setConflicto(null);
      return;
    }
    validar.mutate(
      { nombre_salon: salonSeleccionado, dia: franja.dia, hora_inicio: franja.hora_inicio, hora_fin: franja.hora_fin },
      {
        onSuccess: (res) => setConflicto(res.data.data),
        onError: () => setConflicto(null),
      }
    );
  }, [franja.dia, franja.hora_inicio, franja.hora_fin, salonSeleccionado]);

  const slotsOcupados = useMemo(() => {
    if (!disponibilidad?.slots) return new Set();
    return new Set(disponibilidad.slots.filter((s) => !s.disponible).map((s) => s.hora));
  }, [disponibilidad]);

  function horasFinDisponibles() {
    if (!franja.hora_inicio) return HORAS_FIN;
    return HORAS_FIN.filter((h) => h > franja.hora_inicio);
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-background">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/80">Franja {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-foreground/40 hover:text-destructive transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Día">
          <Select
            value={franja.dia}
            onChange={(e) => onChange({ ...franja, dia: e.target.value, hora_inicio: '', hora_fin: '' })}
          >
            <option value="">-- Día --</option>
            {DIAS_SEMANA.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </FormField>
        <FormField label="Inicio">
          <Select
            value={franja.hora_inicio}
            onChange={(e) => onChange({ ...franja, hora_inicio: e.target.value, hora_fin: '' })}
            disabled={!franja.dia}
          >
            <option value="">-- Inicio --</option>
            {HORAS.map((h) => (
              <option key={h} value={h} disabled={slotsOcupados.has(h)}>
                {h}{slotsOcupados.has(h) ? ' ✗' : ''}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Fin">
          <Select
            value={franja.hora_fin}
            onChange={(e) => onChange({ ...franja, hora_fin: e.target.value })}
            disabled={!franja.hora_inicio}
          >
            <option value="">-- Fin --</option>
            {horasFinDisponibles().map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </Select>
        </FormField>
      </div>
      {isFetching && (
        <p className="text-xs text-foreground/50 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Verificando disponibilidad…</p>
      )}
      {conflicto?.tiene_conflictos && (
        <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2 space-y-0.5">
          <p className="font-semibold flex items-center gap-1"><AlertTriangle size={11} /> Conflictos detectados:</p>
          {conflicto.conflictos.map((c, i) => <p key={i} className="pl-3">· [{c.tipo}] {c.detalle}</p>)}
        </div>
      )}
      {conflicto && !conflicto.tiene_conflictos && franja.hora_inicio && franja.hora_fin && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> Horario disponible</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReservasSemestralesPage() {
  const [vista, setVista] = useState('registrar');
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [solicitanteEncontrado, setSolicitanteEncontrado] = useState(null);
  const [responsableEncontrado, setResponsableEncontrado] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [franjas, setFranjas] = useState([{ ...FRANJA_INICIAL }]);
  const [buscarForm, setBuscarForm] = useState({ dia: '', hora_inicio: '', hora_fin: '', tipo_silleteria: '', capacidad_min: '' });
  const [buscarParams, setBuscarParams] = useState(null);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);

  const carnetProcesadoRef = useRef(null);

  const { data: bloques = [] } = useBloques();
  const { data: salones = [] } = useSalones();
  const crear = useCrearReservaSemestral();

  const { registrarIntencion, cancelarIntencion } = useNFCSocket();
  const ultimoCarnet = useNFCStore((s) => s.ultimoCarnet);
  const intencionActiva = useNFCStore((s) => s.intencionActiva);
  const enCola = useNFCStore((s) => s.enCola);
  const posicionCola = useNFCStore((s) => s.posicionCola);

  const { data: salonesLibres = [], isLoading: buscandoSalones } = useSalonesDisponiblesSemestral(buscarParams);

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

  // NFC activo solo en la pestaña de registro
  useEffect(() => {
    if (vista === 'registrar') {
      registrarIntencion(NFC_MODOS.IDENTIFICACION);
    } else {
      cancelarIntencion();
    }
    return () => cancelarIntencion();
  }, [vista]);

  useEffect(() => {
    if (!ultimoCarnet || vista !== 'registrar') return;
    const eventoCarnet = `${ultimoCarnet.timestamp || ''}:${ultimoCarnet.id_carnet || ''}`;
    if (carnetProcesadoRef.current === eventoCarnet) return;
    carnetProcesadoRef.current = eventoCarnet;
    buscarPersona(ultimoCarnet.id_carnet, objetivoEscaneo);
  }, [ultimoCarnet, vista, objetivoEscaneo]);

  useEffect(() => {
    if (vista !== 'registrar') return;
    const onKeyDown = (e) => {
      if (e.key !== 'F1') return;
      e.preventDefault();
      void handleBuscarPorNombre();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [vista, objetivoEscaneo]);

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
    if (tipoSolicitante !== 'estudiante') setResponsableEncontrado(null);
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
    if (objetivo === 'responsable') setResponsableEncontrado(null);
    else setSolicitanteEncontrado(null);
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
      aplicarPersonaEnFormulario(res.data.data.persona, objetivo, id);
    } catch {
      Swal.fire({ icon: 'warning', title: 'No encontrado', text: `No se encontró persona con "${id}". Puede ingresar el nombre manualmente.`, timer: 3000, showConfirmButton: false });
    } finally {
      setBuscandoPersona(false);
      if (vista === 'registrar') registrarIntencion(NFC_MODOS.IDENTIFICACION);
    }
  }

  function limpiarFormulario() {
    setForm(FORM_INICIAL);
    setFranjas([{ ...FRANJA_INICIAL }]);
    setSolicitanteEncontrado(null);
    setResponsableEncontrado(null);
    carnetProcesadoRef.current = null;
  }

  function handleUsarSalon(salon) {
    setForm((f) => ({ ...f, nombre_bloque: salon.nombre_bloque || '', nombre_salon: salon.nombre_salon || '' }));
    if (buscarParams?.dia && franjas.length === 1 && !franjas[0].dia) {
      setFranjas([{ dia: buscarParams.dia, hora_inicio: buscarParams.hora_inicio || '', hora_fin: buscarParams.hora_fin || '' }]);
    }
    setVista('registrar');
  }

  async function handleCrear() {
    const requiereResponsable = form.tipo_solicitante === 'estudiante';
    if (!form.solicitante_documento || !form.solicitante_nombre || !form.nombre_bloque || !form.nombre_salon || !form.materia) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Documento, nombre, bloque, salón y materia son requeridos.' });
      return;
    }
    if (requiereResponsable && (!form.responsable_documento || !form.responsable_nombre)) {
      Swal.fire({ icon: 'warning', title: 'Falta profesor responsable', text: 'Si el solicitante es estudiante, debes registrar el profesor responsable.' });
      return;
    }
    const franjasValidas = franjas.filter((f) => f.dia && f.hora_inicio && f.hora_fin);
    if (franjasValidas.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin franjas', text: 'Debes agregar al menos una franja horaria completa (día, inicio y fin).' });
      return;
    }

    let forzar = false;
    const conflictosTotales = [];
    for (const f of franjasValidas) {
      try {
        const res = await reservasSemestralesApi.validar({ nombre_salon: form.nombre_salon, dia: f.dia, hora_inicio: f.hora_inicio, hora_fin: f.hora_fin });
        if (res.data.data.tiene_conflictos) {
          conflictosTotales.push({ franja: f, conflictos: res.data.data.conflictos });
        }
      } catch { /* continuar */ }
    }

    if (conflictosTotales.length > 0) {
      const lineas = conflictosTotales.flatMap(({ franja, conflictos }) =>
        conflictos.map((c) => `• ${franja.dia} ${franja.hora_inicio}–${franja.hora_fin} [${c.tipo}] ${c.detalle}`)
      ).join('<br/>');
      const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Conflictos detectados',
        html: `<p class="text-sm text-left mb-2">Existen solapamientos:</p><div class="text-left text-sm">${lineas}</div>`,
        showCancelButton: true,
        confirmButtonText: 'Crear de todas formas',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d97706',
      });
      if (!confirm.isConfirmed) return;
      forzar = true;
    }

    crear.mutate(
      { ...form, franjas: franjasValidas, forzar },
      {
        onSuccess: () => {
          toast.success('Reserva semestral creada correctamente');
          limpiarFormulario();
        },
        onError: (err) => {
          const msg = err?.response?.data?.message || 'Error al crear la reserva';
          Swal.fire({ icon: 'error', title: 'Error', text: msg });
        },
      }
    );
  }
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookMarked className="h-6 w-6" />
          Reservas Semestrales
        </h1>
        <p className="text-muted-foreground text-sm">Gestión de reservas por semestre completo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[
          { id: 'registrar', label: 'Registrar reserva', icon: BookMarked },
          { id: 'buscar', label: 'Buscar espacio disponible', icon: Sparkles },
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

      {/* Tab: Buscar espacio disponible */}
      {vista === 'buscar' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              ¿Qué espacio necesitas?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <FormField label="Día de la semana">
                <Select value={buscarForm.dia} onChange={(e) => setBuscarForm((f) => ({ ...f, dia: e.target.value }))}>
                  <option value="">Seleccionar</option>
                  {DIAS_SEMANA.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
              </FormField>
              <FormField label="Hora inicio">
                <Select value={buscarForm.hora_inicio} onChange={(e) => setBuscarForm((f) => ({ ...f, hora_inicio: e.target.value, hora_fin: '' }))}>
                  <option value="">Seleccionar</option>
                  {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </FormField>
              <FormField label="Hora fin">
                <Select value={buscarForm.hora_fin} onChange={(e) => setBuscarForm((f) => ({ ...f, hora_fin: e.target.value }))} disabled={!buscarForm.hora_inicio}>
                  <option value="">Seleccionar</option>
                  {HORAS.filter((h) => h > buscarForm.hora_inicio).map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </FormField>
              <FormField label="Tipo de silletería">
                <Select value={buscarForm.tipo_silleteria} onChange={(e) => setBuscarForm((f) => ({ ...f, tipo_silleteria: e.target.value }))}>
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
              onClick={() => { setBuscarParams({ dia: buscarForm.dia, hora_inicio: buscarForm.hora_inicio, hora_fin: buscarForm.hora_fin }); setBloqueSeleccionado(null); }}
              disabled={!buscarForm.dia || !buscarForm.hora_inicio || !buscarForm.hora_fin || buscandoSalones}
            >
              {buscandoSalones
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Buscando...</>
                : <><Search className="h-4 w-4 mr-1" />Buscar salones libres</>}
            </Button>
          </div>

          {buscarParams && !buscandoSalones && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {salonesLibresFiltrados.length === 0
                  ? 'Sin salones disponibles con los criterios indicados'
                  : `${salonesLibresFiltrados.length} salón${salonesLibresFiltrados.length !== 1 ? 'es' : ''} disponible${salonesLibresFiltrados.length !== 1 ? 's' : ''} — ${buscarParams.dia}, ${buscarParams.hora_inicio}–${buscarParams.hora_fin}`}
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
                    <Button size="sm" className="w-full" onClick={() => handleUsarSalon(salon)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Usar este salón
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Registrar reserva */}
      {vista === 'registrar' && (
        <div className="bg-card border-2 border-primary/30 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Nueva reserva semestral</h2>
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
                    setForm((f) => ({ ...f, solicitante_documento: e.target.value, solicitante_nombre: '', tipo_solicitante: 'docente', responsable_documento: '', responsable_nombre: '' }));
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
                  {buscandoPersona ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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

            <FormField label="Tipo de solicitante">
              <Select
                value={form.tipo_solicitante}
                onChange={(e) => {
                  setForm((f) => ({ ...f, tipo_solicitante: e.target.value, responsable_documento: '', responsable_nombre: '' }));
                  setResponsableEncontrado(null);
                }}
              >
                <option value="docente">Docente</option>
                <option value="estudiante">Estudiante</option>
              </Select>
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
                      {buscandoPersona ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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
              <Select value={form.nombre_bloque} onChange={(e) => setForm((f) => ({ ...f, nombre_bloque: e.target.value, nombre_salon: '' }))}>
                <option value="">-- Seleccionar bloque --</option>
                {bloques.map((b) => <option key={b._id} value={b.nombre}>{b.nombre}</option>)}
              </Select>
            </FormField>

            <FormField label="Salón">
              <Select value={form.nombre_salon} onChange={(e) => setForm((f) => ({ ...f, nombre_salon: e.target.value }))} disabled={!form.nombre_bloque}>
                <option value="">-- Seleccionar salón --</option>
                {salonesFiltrados.map((s) => <option key={s._id} value={s.nombre}>{s.nombre}</option>)}
              </Select>
            </FormField>

            <FormField label="Materia / Motivo">
              <Input
                value={form.materia}
                onChange={(e) => setForm((f) => ({ ...f, materia: e.target.value }))}
                placeholder="Nombre de la materia o motivo"
              />
            </FormField>
          </div>

          {/* Franjas horarias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Franjas horarias</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFranjas((f) => [...f, { ...FRANJA_INICIAL }])}
                className="gap-1 text-xs"
              >
                <Plus size={12} />Agregar franja
              </Button>
            </div>
            {!form.nombre_salon && (
              <p className="text-xs text-foreground/50 italic">Selecciona un salón para ver disponibilidad</p>
            )}
            {franjas.map((franja, i) => (
              <FranjaRow
                key={i}
                index={i}
                franja={franja}
                salonSeleccionado={form.nombre_salon}
                onChange={(updated) => setFranjas((prev) => prev.map((f, idx) => idx === i ? updated : f))}
                onRemove={() => setFranjas((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCrear} disabled={crear.isPending} className="gap-2">
              {crear.isPending ? <Loader2 size={15} className="animate-spin" /> : <BookMarked size={15} />}
              Crear reserva semestral
            </Button>
            <Button variant="outline" onClick={limpiarFormulario}>Limpiar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
