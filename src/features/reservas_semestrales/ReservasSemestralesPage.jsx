import { useState, useMemo, useEffect, useRef } from 'react';
import {
  useCrearReservaSemestral,
  useValidarConflictosSemestral,
  useSalonesDisponiblesFranja,
  reservasSemestralesApi,
} from './reservasSemestralesApi';
import { useBloques } from '@/features/bloques/bloquesApi';
import { comunidadApi } from '@/features/comunidad/comunidadApi';
import { useNFCSocket } from '@/features/nfc/useNFCSocket';
import { useNFCStore } from '@/features/nfc/nfcStore';
import { NFC_MODOS } from '@/shared/constants';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import {
  BookMarked, Plus, X, Search, Loader2, CreditCard,
  CheckCircle2, AlertTriangle, Clock, UserPlus,
} from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import { cn } from '@/shared/lib/utils';
import { abrirBuscadorPersonaPorNombre } from '@/shared/utils/personaSearchHotkey';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];



const FORM_INICIAL = {
  solicitante_documento: '',
  solicitante_nombre: '',
  tipo_solicitante: 'docente',
  responsable_documento: '',
  responsable_nombre: '',
  materia: '',
};

const FRANJA_INICIAL = { dia: '', hora_inicio: '', hora_fin: '', nombre_salon: '', nombre_bloque: '', motivo_diferente: false, motivo: '', con_monitor: false, monitor_documento: '', monitor_nombre: '' };

// ─────────────────────────────────────────────────────────────────────────────

function FranjaRow({ franja, index, onChange, onRemove, otrasSelecciones }) {
  const { data: salonesDisponibles = [], isFetching: isFetchingSalones } = useSalonesDisponiblesFranja(
    franja.dia,
    franja.hora_inicio,
    franja.hora_fin,
  );

  // Salones ya tomados por otras franjas que se solapan en día y horario
  const salonesUsadosPorOtras = useMemo(() => {
    return new Set(
      otrasSelecciones
        .filter(
          (o) =>
            o.nombre_salon &&
            o.dia === franja.dia &&
            franja.hora_inicio && franja.hora_fin &&
            o.hora_inicio < franja.hora_fin &&
            o.hora_fin > franja.hora_inicio,
        )
        .map((o) => o.nombre_salon),
    );
  }, [otrasSelecciones, franja.dia, franja.hora_inicio, franja.hora_fin]);

  const salonesDisponiblesFiltrados = useMemo(
    () => salonesDisponibles.filter((s) => !salonesUsadosPorOtras.has(s.nombre_salon)),
    [salonesDisponibles, salonesUsadosPorOtras],
  );

  const [bloqueElegido, setBloqueElegido] = useState(franja.nombre_bloque || '');

  // Reset bloque cuando cambia día u horario
  useEffect(() => {
    setBloqueElegido('');
  }, [franja.dia, franja.hora_inicio, franja.hora_fin]);

  // Sincronizar bloqueElegido si la franja ya trae bloque asignado
  useEffect(() => {
    if (franja.nombre_bloque && franja.nombre_bloque !== bloqueElegido) {
      setBloqueElegido(franja.nombre_bloque);
    }
  }, [franja.nombre_bloque]);

  const bloquesDisponibles = useMemo(() => {
    const set = new Set(salonesDisponiblesFiltrados.map((s) => s.nombre_bloque).filter(Boolean));
    return [...set].sort();
  }, [salonesDisponiblesFiltrados]);

  const salonesPorBloque = useMemo(() => {
    if (!bloqueElegido) return [];
    return salonesDisponiblesFiltrados.filter((s) => s.nombre_bloque === bloqueElegido);
  }, [salonesDisponiblesFiltrados, bloqueElegido]);

  const validar = useValidarConflictosSemestral();
  const [conflicto, setConflicto] = useState(null);

  const [buscandoMonitor, setBuscandoMonitor] = useState(false);

  async function buscarMonitorFranja(identificador) {
    const id = String(identificador || '').trim();
    if (!id) return;
    setBuscandoMonitor(true);
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
      onChange({ ...franja, monitor_documento: persona.numero_documento, monitor_nombre: persona.nombre });
    } catch {
      toast.error('No se encontró persona con ese documento o carnet');
    } finally {
      setBuscandoMonitor(false);
    }
  }



  useEffect(() => {
    if (!franja.dia || !franja.hora_inicio || !franja.hora_fin || !franja.nombre_salon) {
      setConflicto(null);
      return;
    }
    validar.mutate(
      { nombre_salon: franja.nombre_salon, dia: franja.dia, hora_inicio: franja.hora_inicio, hora_fin: franja.hora_fin },
      {
        onSuccess: (res) => setConflicto(res.data.data),
        onError: () => setConflicto(null),
      }
    );
  }, [franja.dia, franja.hora_inicio, franja.hora_fin, franja.nombre_salon]);

  const franjaCompleta = franja.dia && franja.hora_inicio && franja.hora_fin;

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
            onChange={(e) => onChange({ ...franja, dia: e.target.value, hora_inicio: '', hora_fin: '', nombre_salon: '', nombre_bloque: '' })}
          >
            <option value="">-- Día --</option>
            {DIAS_SEMANA.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </FormField>
        <FormField label="Inicio">
          <Input
            type="time"
            min="07:00"
            max="23:30"
            step="1800"
            value={franja.hora_inicio}
            disabled={!franja.dia}
            onChange={(e) => onChange({ ...franja, hora_inicio: e.target.value, hora_fin: '', nombre_salon: '', nombre_bloque: '' })}
          />
        </FormField>
        <FormField label="Fin">
          <Input
            type="time"
            step="1800"
            min={franja.hora_inicio || '07:30'}
            disabled={!franja.hora_inicio}
            value={franja.hora_fin}
            onChange={(e) => onChange({ ...franja, hora_fin: e.target.value, nombre_salon: '', nombre_bloque: '' })}
          />
        </FormField>
      </div>

      {/* Selector de salón disponible para esta franja */}
      {franjaCompleta && (
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Bloque disponible">
            {isFetchingSalones
              ? <p className="text-xs text-foreground/50 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Buscando…</p>
              : salonesDisponiblesFiltrados.length === 0
                ? <p className="text-xs text-amber-600 dark:text-amber-400">Sin salones disponibles para este horario</p>
                : (
                  <Select
                    value={bloqueElegido}
                    onChange={(e) => {
                      setBloqueElegido(e.target.value);
                      onChange({ ...franja, nombre_bloque: e.target.value, nombre_salon: '' });
                    }}
                  >
                    <option value="">-- Seleccionar bloque --</option>
                    {bloquesDisponibles.map((b) => (
                      <option key={b} value={b}>Bloque {b} ({salonesDisponiblesFiltrados.filter((s) => s.nombre_bloque === b).length})</option>
                    ))}
                  </Select>
                )}
          </FormField>
          <FormField label="Salón disponible">
            <Select
              value={franja.nombre_salon || ''}
              onChange={(e) => {
                const salon = salonesPorBloque.find((s) => s.nombre_salon === e.target.value);
                if (salon) onChange({ ...franja, nombre_salon: salon.nombre_salon, nombre_bloque: salon.nombre_bloque });
              }}
              disabled={!bloqueElegido || salonesPorBloque.length === 0}
            >
              <option value="">-- Seleccionar salón --</option>
              {salonesPorBloque.map((s) => (
                <option key={s.nombre_salon} value={s.nombre_salon}>{s.nombre_salon}</option>
              ))}
            </Select>
          </FormField>
        </div>
      )}

      {/* Salón asignado a esta franja */}
      {franja.nombre_salon && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 size={11} /> Salón asignado: <strong>{franja.nombre_salon}</strong> — Bloque {franja.nombre_bloque}
        </p>
      )}

      {/* Motivo diferente para esta franja */}
      {franjaCompleta && (
        <div className="space-y-1.5 border-t pt-2 mt-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={franja.motivo_diferente}
              onChange={(e) => onChange({ ...franja, motivo_diferente: e.target.checked, motivo: '' })}
              className="rounded border-border"
            />
            <span className="text-foreground/70">Motivo específico para esta franja</span>
          </label>
          {franja.motivo_diferente && (
            <FormField label="Motivo de esta franja">
              <Input
                value={franja.motivo}
                onChange={(e) => onChange({ ...franja, motivo: e.target.value })}
                placeholder="Escribe el motivo específico (sobreescribe la materia general)"
              />
            </FormField>
          )}
        </div>
      )}

      {/* Monitor específico para esta franja */}
      {franjaCompleta && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={franja.con_monitor}
              onChange={(e) => onChange({ ...franja, con_monitor: e.target.checked, monitor_documento: '', monitor_nombre: '' })}
              className="rounded border-border"
            />
            <span className="text-foreground/70 flex items-center gap-1"><UserPlus size={11} /> Asignar monitor para esta franja</span>
          </label>
          {franja.con_monitor && (
            <div className="space-y-1.5 pl-5">
              <div className="flex gap-1">
                <Input
                  value={franja.monitor_documento}
                  onChange={(e) => onChange({ ...franja, monitor_documento: e.target.value, monitor_nombre: '' })}
                  onKeyDown={(e) => e.key === 'Enter' && buscarMonitorFranja(franja.monitor_documento)}
                  placeholder="Documento o carnet del monitor"
                />
                <button
                  type="button"
                  onClick={() => buscarMonitorFranja(franja.monitor_documento)}
                  disabled={buscandoMonitor}
                  className="px-2 rounded border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50 shrink-0"
                  title="Buscar monitor"
                >
                  {buscandoMonitor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                </button>
              </div>
              {franja.monitor_nombre && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Monitor asignado: <strong>{franja.monitor_nombre}</strong>
                  <button
                    type="button"
                    onClick={() => onChange({ ...franja, monitor_documento: '', monitor_nombre: '' })}
                    className="ml-1 text-foreground/40 hover:text-destructive transition-colors"
                  >
                    <X size={10} />
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
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
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [solicitanteEncontrado, setSolicitanteEncontrado] = useState(null);
  const [responsableEncontrado, setResponsableEncontrado] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [franjas, setFranjas] = useState([{ ...FRANJA_INICIAL }]);

  const carnetProcesadoRef = useRef(null);

  const { data: bloques = [] } = useBloques();
  const crear = useCrearReservaSemestral();

  const { registrarIntencion, cancelarIntencion } = useNFCSocket();
  const ultimoCarnet = useNFCStore((s) => s.ultimoCarnet);
  const intencionActiva = useNFCStore((s) => s.intencionActiva);
  const enCola = useNFCStore((s) => s.enCola);
  const posicionCola = useNFCStore((s) => s.posicionCola);

  const objetivoEscaneo = useMemo(() => {
    if (!solicitanteEncontrado) return 'solicitante';
    if (form.tipo_solicitante === 'estudiante' && !responsableEncontrado) return 'responsable';
    return 'solicitante';
  }, [solicitanteEncontrado, responsableEncontrado, form.tipo_solicitante]);

  // NFC activo siempre que la página esté montada
  useEffect(() => {
    registrarIntencion(NFC_MODOS.IDENTIFICACION);
    return () => cancelarIntencion();
  }, []);

  useEffect(() => {
    if (!ultimoCarnet) return;
    const eventoCarnet = `${ultimoCarnet.timestamp || ''}:${ultimoCarnet.id_carnet || ''}`;
    if (carnetProcesadoRef.current === eventoCarnet) return;
    carnetProcesadoRef.current = eventoCarnet;
    buscarPersona(ultimoCarnet.id_carnet, objetivoEscaneo);
  }, [ultimoCarnet, objetivoEscaneo]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'F1') return;
      e.preventDefault();
      void handleBuscarPorNombre();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [objetivoEscaneo]);

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
      registrarIntencion(NFC_MODOS.IDENTIFICACION);
    }
  }

  function limpiarFormulario() {
    setForm(FORM_INICIAL);
    setFranjas([{ ...FRANJA_INICIAL }]);
    setSolicitanteEncontrado(null);
    setResponsableEncontrado(null);
    carnetProcesadoRef.current = null;
  }

  async function handleCrear() {
    const requiereResponsable = form.tipo_solicitante === 'estudiante';
    if (!form.solicitante_documento || !form.solicitante_nombre || !form.materia) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Documento, nombre y materia son requeridos.' });
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

    // Verificar que no haya dos franjas con el mismo día y horario
    const llaves = franjasValidas.map((f) => `${f.dia}|${f.hora_inicio}|${f.hora_fin}`);
    if (new Set(llaves).size !== llaves.length) {
      Swal.fire({ icon: 'warning', title: 'Franjas duplicadas', text: 'No pueden existir dos franjas con el mismo día y horario.' });
      return;
    }

    // Verificar que todas las franjas tengan salón asignado
    const sinSalon = franjasValidas.filter((f) => !f.nombre_salon);
    if (sinSalon.length > 0) {
      Swal.fire({ icon: 'warning', title: 'Salón no asignado', text: `${sinSalon.length === 1 ? 'Una franja no tiene' : `${sinSalon.length} franjas no tienen`} salón asignado. Selecciona el salón en cada franja antes de continuar.` });
      return;
    }

    let forzar = false;
    const conflictosTotales = [];
    for (const f of franjasValidas) {
      try {
        const res = await reservasSemestralesApi.validar({ nombre_salon: f.nombre_salon, dia: f.dia, hora_inicio: f.hora_inicio, hora_fin: f.hora_fin });
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
              />
              <button
                type="button"
                onClick={() => buscarPersona(form.solicitante_documento, 'solicitante')}
                disabled={buscandoPersona}
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
                  />
                  {responsableEncontrado && (
                    <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
              </FormField>
            </>
          )}

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
          <p className="text-xs text-foreground/50 italic">Completa día e horario en cada franja para ver los salones disponibles.</p>
          {franjas.map((franja, i) => (
            <FranjaRow
              key={i}
              index={i}
              franja={franja}
              otrasSelecciones={franjas.filter((_, idx) => idx !== i)}
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
    </div>
  );
}
