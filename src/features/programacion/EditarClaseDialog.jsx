import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/shared/components/ui/Dialog';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import Button from '@/shared/components/ui/Button';
import { abrirBuscadorPersonaPorNombre } from '@/shared/utils/personaSearchHotkey';
import { reservasSemestralesApi, useValidarConflictosSemestral } from '@/features/reservas_semestrales/reservasSemestralesApi';
import { useSalones } from '@/features/salones/salonesApi';
import { useActualizarClase } from './programacionApi';
import { showSuccess, showError } from '@/shared/utils/alert';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function EditarClaseDialog({ open, onOpenChange, clase, semestre, facultades = [] }) {
  const actualizarClase = useActualizarClase();
  const validarConflictos = useValidarConflictosSemestral();

  const [form, setForm] = useState({});
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState('');
  const [conflictos, setConflictos] = useState(null);
  const bloqueIniciado = useRef(false);
  const originalSalonRef = useRef(null);
  const claseIdRef = useRef(null);

  useEffect(() => {
    if (clase && open) {
      claseIdRef.current = clase._id;
      const diaMatchado = DIAS.find(
        (d) => d.toLowerCase() === (clase.dia || '').toLowerCase()
      ) || clase.dia || '';
      setForm({
        numero_documento: clase.numero_documento || '',
        docente: clase.docente || '',
        materia: clase.materia || '',
        facultad: clase.facultad || '',
        dia: diaMatchado,
        hora_inicio: clase.hora_inicio || '',
        hora_fin: clase.hora_fin || '',
        aula: clase.aula || '',
      });
      setBloqueSeleccionado('');
      bloqueIniciado.current = false;
      originalSalonRef.current = null;
      setConflictos(null);
    }
  }, [clase, open]);

  const { data: todosSalones = [] } = useSalones({ enabled: !!(clase && open) });

  const { data: salonesDisponibles = [], isFetching: loadingSalones } = useQuery({
    queryKey: ['edit-clase-salones', form.dia, form.hora_inicio, form.hora_fin, semestre, clase?._id],
    queryFn: () =>
      reservasSemestralesApi
        .salonesDisponibles(form.dia, form.hora_inicio, form.hora_fin, semestre, undefined, undefined, undefined, clase?._id)
        .then((r) => r.data.data.salones || []),
    enabled: !!(form.dia && form.hora_inicio && form.hora_fin),
    staleTime: 30000,
  });

  const normSalon = (a) => String(a || '').replace(/-/g, '').toUpperCase().trim();

  useEffect(() => {
    if (bloqueIniciado.current || !open || !clase?.aula) return;
    // Buscar en disponibles primero; si el backend lo excluyó (excluir_id falla), caer en lista completa
    const salon =
      salonesDisponibles.find((s) => normSalon(s.nombre_salon) === normSalon(clase.aula)) ||
      todosSalones.find((s) => normSalon(s.nombre_salon) === normSalon(clase.aula));
    if (!salon) return;
    bloqueIniciado.current = true;
    originalSalonRef.current = salon;
    if (salon.nombre_bloque) setBloqueSeleccionado(salon.nombre_bloque);
    setForm((f) => ({ ...f, aula: salon.nombre_salon }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonesDisponibles, todosSalones, open]);

  const bloques = (() => {
    const set = new Set(salonesDisponibles.map((s) => s.nombre_bloque).filter(Boolean));
    const originalBloque = originalSalonRef.current?.nombre_bloque;
    if (originalBloque) set.add(originalBloque);
    return [...set].sort();
  })();
  const salonesPerBloque = Object.fromEntries(
    bloques.map((b) => [b, salonesDisponibles.filter((s) => s.nombre_bloque === b).length])
  );
  const salonesFiltrados = salonesDisponibles.filter(
    (s) => !bloqueSeleccionado || s.nombre_bloque === bloqueSeleccionado
  );
  // Construir opciones: salones filtrados + siempre incluir form.aula y clase.aula
  // aunque el backend los haya excluido de disponibles (ej: misma clase marca su salon como ocupado)
  const opcionesSalon = (() => {
    const opts = [...salonesFiltrados];
    const addSalon = (aula, hint) => {
      if (!aula) return;
      if (opts.some((s) => normSalon(s.nombre_salon) === normSalon(aula))) return;
      const salonObj = salonesDisponibles.find((s) => normSalon(s.nombre_salon) === normSalon(aula)) || hint;
      // No agregar si pertenece a un bloque diferente al filtro activo
      if (salonObj && bloqueSeleccionado && salonObj.nombre_bloque !== bloqueSeleccionado) return;
      opts.unshift(salonObj || { nombre_salon: aula, nombre_bloque: '' });
    };
    addSalon(form.aula);
    addSalon(clase?.aula, originalSalonRef.current);
    return opts;
  })();

  useEffect(() => {
    if (!form.aula || !form.dia || !form.hora_inicio || !form.hora_fin) {
      setConflictos(null);
      return;
    }
    setConflictos(null);
    validarConflictos.mutate(
      { nombre_salon: form.aula, dia: form.dia, hora_inicio: form.hora_inicio, hora_fin: form.hora_fin, semestre, excluir_id: clase?._id },
      {
        onSuccess: (res) => setConflictos(res.data.data.conflictos || []),
        onError: () => setConflictos(null),
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.aula, form.dia, form.hora_inicio, form.hora_fin]);

  async function handleBuscarDocente() {
    const persona = await abrirBuscadorPersonaPorNombre({
      titulo: 'Seleccionar docente responsable',
      tipo: 'docente',
      placeholder: 'Escribe nombre del docente',
    });
    if (persona) {
      setForm((f) => ({
        ...f,
        numero_documento: persona.numero_documento || '',
        docente: persona.nombre || '',
      }));
    }
  }

  function resetFranja(nivel) {
    if (nivel === 'dia') setForm((f) => ({ ...f, hora_inicio: '', hora_fin: '', aula: '' }));
    if (nivel === 'hora_inicio') setForm((f) => ({ ...f, hora_fin: '', aula: '' }));
    if (nivel === 'hora_fin') setForm((f) => ({ ...f, aula: '' }));
    setBloqueSeleccionado('');
    setConflictos(null);
  }

  const horaInvalida = !!(form.hora_inicio && form.hora_fin && form.hora_fin <= form.hora_inicio);
  const franjaCompleta = !!(form.dia && form.hora_inicio && form.hora_fin && !horaInvalida);

  async function handleGuardar() {
    if (!form.materia?.trim()) { showError('El nombre de la asignatura es requerido'); return; }
    if (horaInvalida) { showError('La hora de fin debe ser mayor que la hora de inicio'); return; }
    if (!form.aula) { showError('Selecciona un salón'); return; }
    try {
      await actualizarClase.mutateAsync({ id: claseIdRef.current, ...form });
      showSuccess('Clase actualizada correctamente');
      onOpenChange(false);
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Error al actualizar la clase');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Editar clase</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Número de documento + F1 | Docente */}
          <FormField label="Número de documento">
            <div className="flex gap-2">
              <Input
                placeholder="Cédula o código"
                value={form.numero_documento || ''}
                onChange={(e) => setForm((f) => ({ ...f, numero_documento: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'F1') { e.preventDefault(); handleBuscarDocente(); } }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleBuscarDocente}
                title="F1 — Buscar docente"
                className="flex items-center gap-1 shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs font-mono">F1</span>
              </Button>
            </div>
          </FormField>

          <FormField label="Docente / Responsable">
            <Input
              placeholder="Nombre del docente"
              value={form.docente || ''}
              onChange={(e) => setForm((f) => ({ ...f, docente: e.target.value }))}
            />
          </FormField>

          {/* Asignatura | Facultad */}
          <FormField label="Asignatura">
            <Input
              placeholder="Nombre de la asignatura"
              value={form.materia || ''}
              onChange={(e) => setForm((f) => ({ ...f, materia: e.target.value }))}
            />
          </FormField>

          <FormField label="Facultad">
            <Input
              list="facultades-edit-list"
              placeholder="Escribe o selecciona facultad"
              value={form.facultad || ''}
              onChange={(e) => setForm((f) => ({ ...f, facultad: e.target.value }))}
            />
            <datalist id="facultades-edit-list">
              {facultades.map((fac) => <option key={fac} value={fac} />)}
            </datalist>
          </FormField>

          {/* Día | (vacío) */}
          <FormField label="Día">
            <Select
              value={form.dia || ''}
              onChange={(e) => { setForm((f) => ({ ...f, dia: e.target.value })); resetFranja('dia'); }}
            >
              <option value="">Seleccione...</option>
              {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </FormField>

          <div />

          {/* Hora inicio — time picker */}
          <FormField label="Hora inicio">
            <input
              type="time"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              value={form.hora_inicio || ''}
              onChange={(e) => { setForm((f) => ({ ...f, hora_inicio: e.target.value })); resetFranja('hora_inicio'); }}
              disabled={!form.dia}
            />
          </FormField>

          {/* Hora fin — time picker */}
          <FormField label="Hora fin">
            <input
              type="time"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              value={form.hora_fin || ''}
              onChange={(e) => { setForm((f) => ({ ...f, hora_fin: e.target.value })); resetFranja('hora_fin'); }}
              disabled={!form.hora_inicio}
            />
            {horaInvalida && (
              <p className="text-xs text-destructive mt-1">La hora fin debe ser mayor que la hora inicio</p>
            )}
          </FormField>

          {/* Bloque + Salón */}
          {franjaCompleta && (
            <>
              <FormField label="Bloque">
                <Select
                  value={bloqueSeleccionado}
                  onChange={(e) => { setBloqueSeleccionado(e.target.value); setForm((f) => ({ ...f, aula: '' })); setConflictos(null); }}
                >
                  <option value="">Todos los bloques</option>
                  {bloques.map((b) => (
                    <option key={b} value={b}>{b} ({salonesPerBloque[b]})</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Salón">
                <div className="flex items-center gap-2">
                  <Select
                    value={form.aula || ''}
                    onChange={(e) => setForm((f) => ({ ...f, aula: e.target.value }))}
                    disabled={loadingSalones}
                    className="flex-1"
                  >
                    <option value="">Seleccione salón...</option>
                    {opcionesSalon.map((s) => (
                      <option key={s.nombre_salon} value={s.nombre_salon}>{s.nombre_salon}</option>
                    ))}
                  </Select>
                  {loadingSalones && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                </div>
              </FormField>
            </>
          )}

          {/* Estado de conflictos */}
          {form.aula && (
            <div className="col-span-2">
              {validarConflictos.isPending ? (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verificando disponibilidad...
                </div>
              ) : conflictos !== null && (
                conflictos.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                    <CheckCircle className="h-4 w-4" /> Horario disponible
                  </div>
                ) : (
                  <div className="text-sm text-destructive space-y-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <XCircle className="h-4 w-4" /> Conflictos detectados:
                    </div>
                    <ul className="ml-5 list-disc space-y-0.5">
                      {conflictos.map((c, i) => <li key={i}>{c.detalle}</li>)}
                    </ul>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleGuardar} disabled={actualizarClase.isPending}>
            {actualizarClase.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
