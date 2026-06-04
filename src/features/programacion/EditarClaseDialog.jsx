import { useState, useEffect } from 'react';
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
import { useActualizarClase } from './programacionApi';
import { showSuccess, showError } from '@/shared/utils/alert';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HORAS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

export default function EditarClaseDialog({ open, onOpenChange, clase, semestre, facultades = [] }) {
  const actualizarClase = useActualizarClase();
  const validarConflictos = useValidarConflictosSemestral();

  const [form, setForm] = useState({});
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState('');
  const [conflictos, setConflictos] = useState(null);

  useEffect(() => {
    if (clase && open) {
      setForm({
        numero_documento: clase.numero_documento || '',
        docente: clase.docente || '',
        materia: clase.materia || '',
        facultad: clase.facultad || '',
        dia: clase.dia || '',
        hora_inicio: clase.hora_inicio || '',
        hora_fin: clase.hora_fin || '',
        aula: clase.aula || '',
      });
      setBloqueSeleccionado('');
      setConflictos(null);
    }
  }, [clase, open]);

  const { data: salonesDisponibles = [], isFetching: loadingSalones } = useQuery({
    queryKey: ['edit-clase-salones', form.dia, form.hora_inicio, form.hora_fin, semestre, clase?._id],
    queryFn: () =>
      reservasSemestralesApi
        .salonesDisponibles(form.dia, form.hora_inicio, form.hora_fin, semestre, undefined, undefined, undefined, clase?._id)
        .then((r) => r.data.data.salones || []),
    enabled: !!(form.dia && form.hora_inicio && form.hora_fin),
    staleTime: 30000,
  });

  const bloques = [...new Set(salonesDisponibles.map((s) => s.nombre_bloque).filter(Boolean))].sort();
  const salonesFiltrados = salonesDisponibles.filter(
    (s) => !bloqueSeleccionado || s.nombre_bloque === bloqueSeleccionado
  );

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

  async function handleGuardar() {
    if (!form.materia?.trim()) { showError('El nombre de la asignatura es requerido'); return; }
    if (!form.aula) { showError('Selecciona un salón'); return; }
    try {
      await actualizarClase.mutateAsync({ id: clase._id, ...form });
      showSuccess('Clase actualizada correctamente');
      onOpenChange(false);
    } catch (e) {
      showError(e.response?.data?.message || 'Error al actualizar la clase');
    }
  }

  const franjaCompleta = !!(form.dia && form.hora_inicio && form.hora_fin);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar clase</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número de documento" className="col-span-2">
            <div className="flex gap-2">
              <Input
                placeholder="Cédula o código"
                value={form.numero_documento || ''}
                onChange={(e) => setForm((f) => ({ ...f, numero_documento: e.target.value }))}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleBuscarDocente} title="Buscar en comunidad (F1)">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </FormField>

          <FormField label="Docente / Responsable" className="col-span-2">
            <Input
              placeholder="Nombre del docente"
              value={form.docente || ''}
              onChange={(e) => setForm((f) => ({ ...f, docente: e.target.value }))}
            />
          </FormField>

          <FormField label="Asignatura" className="col-span-2">
            <Input
              placeholder="Nombre de la asignatura"
              value={form.materia || ''}
              onChange={(e) => setForm((f) => ({ ...f, materia: e.target.value }))}
            />
          </FormField>

          <FormField label="Facultad" className="col-span-2">
            <Select
              value={form.facultad || ''}
              onChange={(e) => setForm((f) => ({ ...f, facultad: e.target.value }))}
            >
              <option value="">Sin especificar</option>
              {facultades.map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </Select>
          </FormField>

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

          <FormField label="Hora inicio">
            <Select
              value={form.hora_inicio || ''}
              onChange={(e) => { setForm((f) => ({ ...f, hora_inicio: e.target.value })); resetFranja('hora_inicio'); }}
              disabled={!form.dia}
            >
              <option value="">Seleccione...</option>
              {HORAS.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
            </Select>
          </FormField>

          <FormField label="Hora fin">
            <Select
              value={form.hora_fin || ''}
              onChange={(e) => { setForm((f) => ({ ...f, hora_fin: e.target.value })); resetFranja('hora_fin'); }}
              disabled={!form.hora_inicio}
            >
              <option value="">Seleccione...</option>
              {HORAS.filter((h) => !form.hora_inicio || h > form.hora_inicio).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </Select>
          </FormField>

          {franjaCompleta && (
            <>
              <FormField label="Bloque">
                <Select
                  value={bloqueSeleccionado}
                  onChange={(e) => { setBloqueSeleccionado(e.target.value); setForm((f) => ({ ...f, aula: '' })); setConflictos(null); }}
                >
                  <option value="">Todos los bloques</option>
                  {bloques.map((b) => <option key={b} value={b}>{b}</option>)}
                </Select>
              </FormField>

              <FormField label={loadingSalones ? 'Salón (cargando...)' : `Salón (${salonesFiltrados.length} disponibles)`}>
                <div className="flex items-center gap-2">
                  <Select
                    value={form.aula || ''}
                    onChange={(e) => setForm((f) => ({ ...f, aula: e.target.value }))}
                    disabled={loadingSalones}
                    className="flex-1"
                  >
                    <option value="">Seleccione salón...</option>
                    {salonesFiltrados.map((s) => (
                      <option key={s.nombre_salon} value={s.nombre_salon}>{s.nombre_salon}</option>
                    ))}
                  </Select>
                  {loadingSalones && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                </div>
              </FormField>
            </>
          )}

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
