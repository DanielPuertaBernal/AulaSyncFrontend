import { useState, useEffect } from 'react';
import {
  useSalones,
  useCrearSalon,
  useActualizarSalon,
  useEliminarSalon,
} from './salonesApi';
import {
  useBloques,
  useCrearBloque,
  useActualizarBloque,
  useEliminarBloque,
} from '@/features/bloques/bloquesApi';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import {
  School,
  Building2,
  DoorOpen,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeft,
  Users,
  Armchair,
  Plus,
  Search,
} from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/shared/components/ui/Sheet';

export default function SalonesPage() {
  const { data: salones = [], isLoading: loadingSalones } = useSalones();
  const { data: bloques = [], isLoading: loadingBloques } = useBloques();

  const crearSalon = useCrearSalon();
  const actualizarSalon = useActualizarSalon();
  const eliminarSalon = useEliminarSalon();
  const crearBloque = useCrearBloque();
  const actualizarBloque = useActualizarBloque();
  const eliminarBloque = useEliminarBloque();

  // Drill-down state
  const [selectedBloque, setSelectedBloque] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [busquedaBloques, setBusquedaBloques] = useState('');
  const [busquedaSalones, setBusquedaSalones] = useState('');

  // Sheet state
  const [sheet, setSheet] = useState({ open: false, tipo: null, data: null });
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  // Click-outside to close kebab menu
  useEffect(() => {
    if (!openMenuId) return;
    function handleClick() { setOpenMenuId(null); }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenuId]);

  // Derived data
  const bloquesSalones = bloques
    .map((b) => ({
      ...b,
      count: salones.filter(
        (s) =>
          String(s.nombre_bloque || '').toUpperCase() ===
          String(b.nombre_bloque || '').toUpperCase()
      ).length,
    }))
    .filter((b) =>
      busquedaBloques
        ? String(b.nombre_bloque || '').toUpperCase().includes(busquedaBloques.toUpperCase())
        : true
    );

  const salonesDelBloque = selectedBloque
    ? salones
        .filter(
          (s) =>
            String(s.nombre_bloque || '').toUpperCase() === selectedBloque.toUpperCase()
        )
        .filter((s) =>
          busquedaSalones
            ? String(s.nombre_salon || '').toUpperCase().includes(busquedaSalones.toUpperCase())
            : true
        )
    : [];

  // ── Sheet helpers ────────────────────────────────────────────
  function openSheet(tipo, data = null) {
    setErrors({});
    setSheet({ open: true, tipo, data });
    if (tipo === 'nuevo-bloque') setForm({ nombre_bloque: '' });
    if (tipo === 'editar-bloque') setForm({ nombre_bloque: data?.nombre_bloque || '' });
    if (tipo === 'nuevo-salon') {
      setForm({
        nombre_salon: '',
        nombre_bloque: selectedBloque || '',
        capacidad_estudiantes: '',
        tipo_silleteria: '',
      });
    }
    if (tipo === 'editar-salon') {
      setForm({
        nombre_salon: data?.nombre_salon || '',
        nombre_bloque: data?.nombre_bloque || '',
        capacidad_estudiantes: data?.capacidad_estudiantes || '',
        tipo_silleteria: data?.tipo_silleteria || '',
      });
    }
  }

  function closeSheet() {
    setSheet({ open: false, tipo: null, data: null });
    setForm({});
    setErrors({});
  }

  // ── BLOQUES ──────────────────────────────────────────────────
  async function guardarBloque() {
    const nombre = form.nombre_bloque?.trim();
    if (!nombre) {
      setErrors({ nombre_bloque: 'El nombre del bloque es requerido' });
      return;
    }
    try {
      if (sheet.data?._id) {
        await actualizarBloque.mutateAsync({ id: sheet.data._id, nombre_bloque: nombre });
        showSuccess('Bloque actualizado correctamente');
      } else {
        await crearBloque.mutateAsync({ nombre_bloque: nombre });
        showSuccess('Bloque creado correctamente');
      }
      closeSheet();
    } catch (e) {
      showError(e.response?.data?.message || 'Error al guardar bloque');
    }
  }

  async function onEliminarBloque(bloque) {
    const enUso = salones.some(
      (s) =>
        String(s.nombre_bloque || '').toUpperCase() ===
        String(bloque.nombre_bloque || '').toUpperCase()
    );
    if (enUso) {
      showError('No se puede eliminar un bloque que está asignado a salones');
      return;
    }
    const { isConfirmed } = await showConfirm(
      'Eliminar bloque',
      `¿Desea eliminar el bloque ${bloque.nombre_bloque}?`
    );
    if (!isConfirmed) return;
    try {
      await eliminarBloque.mutateAsync(bloque._id);
      showSuccess('Bloque eliminado correctamente');
    } catch (e) {
      showError(e.response?.data?.message || 'Error al eliminar bloque');
    }
  }

  // ── SALONES ──────────────────────────────────────────────────
  async function guardarSalon() {
    const errs = {};
    if (!form.nombre_salon?.trim()) errs.nombre_salon = 'El nombre del salón es requerido';
    if (!form.nombre_bloque?.trim()) errs.nombre_bloque = 'Seleccione un bloque';
    if (!form.capacidad_estudiantes || Number(form.capacidad_estudiantes) < 1)
      errs.capacidad_estudiantes = 'La capacidad debe ser mayor que 0';
    if (!form.tipo_silleteria?.trim()) errs.tipo_silleteria = 'El tipo de silletería es requerido';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      nombre_salon: form.nombre_salon.trim(),
      nombre_bloque: form.nombre_bloque.trim(),
      capacidad_estudiantes: Number(form.capacidad_estudiantes),
      tipo_silleteria: form.tipo_silleteria.trim(),
    };

    try {
      if (sheet.data?._id) {
        await actualizarSalon.mutateAsync({ id: sheet.data._id, ...payload });
        showSuccess('Salón actualizado correctamente');
      } else {
        await crearSalon.mutateAsync(payload);
        showSuccess('Salón creado correctamente');
      }
      closeSheet();
    } catch (e) {
      showError(e.response?.data?.message || 'Error al guardar salón');
    }
  }

  async function onEliminarSalon(salon) {
    const { isConfirmed } = await showConfirm(
      'Eliminar salón',
      `¿Desea eliminar el salón ${salon.nombre_salon}?`
    );
    if (!isConfirmed) return;
    try {
      await eliminarSalon.mutateAsync(salon._id);
      showSuccess('Salón eliminado correctamente');
    } catch (e) {
      showError(e.response?.data?.message || 'Error al eliminar salón');
    }
  }

  const isSaving =
    crearBloque.isPending ||
    actualizarBloque.isPending ||
    crearSalon.isPending ||
    actualizarSalon.isPending;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedBloque && (
            <button
              onClick={() => { setSelectedBloque(null); setBusquedaSalones(''); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Bloques
            </button>
          )}
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <School className="h-6 w-6" />
            {selectedBloque ? (
              <>
                <span className="text-muted-foreground font-normal">/</span>
                <Building2 className="h-5 w-5" />
                {selectedBloque}
              </>
            ) : (
              'Salones'
            )}
          </h1>
        </div>
        {selectedBloque ? (
          <Button onClick={() => openSheet('nuevo-salon')}>
            <Plus className="h-4 w-4" />
            Agregar salón
          </Button>
        ) : (
          <Button onClick={() => openSheet('nuevo-bloque')}>
            <Plus className="h-4 w-4" />
            Nuevo bloque
          </Button>
        )}
      </div>

      {/* ── Vista Grid de Bloques ───────────────────────────────── */}
      {!selectedBloque && (
        <>
          {/* Buscador de bloques */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar bloque..."
              value={busquedaBloques}
              onChange={(e) => setBusquedaBloques(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {loadingBloques ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-muted/50 rounded-xl h-36 animate-pulse" />
              ))}
            </div>
          ) : bloques.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">No hay bloques registrados</p>
              <p className="text-sm">Crea el primer bloque para empezar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {bloquesSalones.map((b) => (
                <div
                  key={b._id}
                  onClick={() => setSelectedBloque(b.nombre_bloque)}
                  className="relative bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                >
                  {/* Kebab button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId((prev) => (prev === b._id ? null : b._id));
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Kebab dropdown */}
                  {openMenuId === b._id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-10 right-3 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[148px]"
                    >
                      <button
                        onClick={() => { setOpenMenuId(null); openSheet('editar-bloque', b); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar bloque
                      </button>
                      <button
                        onClick={() => { setOpenMenuId(null); onEliminarBloque(b); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar bloque
                      </button>
                    </div>
                  )}

                  {/* Card content */}
                  <Building2 className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground text-lg leading-tight">
                    {b.nombre_bloque}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {b.count} {b.count === 1 ? 'salón' : 'salones'}
                  </p>
                  <ChevronRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Vista Detalle Salones ───────────────────────────────── */}
      {selectedBloque && (
        <>
          {/* Buscador de salones */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar salón..."
              value={busquedaSalones}
              onChange={(e) => setBusquedaSalones(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <p className="text-sm text-muted-foreground -mt-2">
            {salonesDelBloque.length}{' '}
            {salonesDelBloque.length === 1 ? 'salón registrado' : 'salones registrados'} en este bloque
          </p>

          {loadingSalones ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-muted/50 rounded-xl h-28 animate-pulse" />
              ))}
            </div>
          ) : salonesDelBloque.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              <DoorOpen className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">No hay salones en este bloque</p>
              <p className="text-sm mb-4">Agrega el primer salón para empezar</p>
              <Button variant="outline" onClick={() => openSheet('nuevo-salon')}>
                <Plus className="h-4 w-4" />
                Agregar salón
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {salonesDelBloque.map((s) => (
                <div
                  key={s._id}
                  className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-semibold text-foreground text-base leading-tight">
                        {s.nombre_salon}
                      </h3>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openSheet('editar-salon', s)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Editar salón"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onEliminarSalon(s)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Eliminar salón"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {s.capacidad_estudiantes} estudiantes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Armchair className="h-3.5 w-3.5" />
                      {s.tipo_silleteria}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Sheet lateral ──────────────────────────────────────── */}
      <Sheet open={sheet.open} onOpenChange={(v) => !v && closeSheet()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {sheet.tipo === 'nuevo-bloque' && 'Nuevo bloque'}
              {sheet.tipo === 'editar-bloque' && 'Editar bloque'}
              {sheet.tipo === 'nuevo-salon' && 'Agregar salón'}
              {sheet.tipo === 'editar-salon' && 'Editar salón'}
            </SheetTitle>
            <SheetDescription>
              {sheet.tipo?.includes('bloque')
                ? 'Complete los datos del bloque.'
                : 'Complete los datos del salón.'}
            </SheetDescription>
          </SheetHeader>

          {/* Bloque form */}
          {(sheet.tipo === 'nuevo-bloque' || sheet.tipo === 'editar-bloque') && (
            <div className="space-y-4">
              <FormField label="Nombre del Bloque" required error={errors.nombre_bloque}>
                <Input
                  placeholder="Ej: Bloque J"
                  value={form.nombre_bloque || ''}
                  onChange={(e) => setForm({ ...form, nombre_bloque: e.target.value })}
                />
              </FormField>
            </div>
          )}

          {/* Salon form */}
          {(sheet.tipo === 'nuevo-salon' || sheet.tipo === 'editar-salon') && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nombre Salón" required error={errors.nombre_salon} className="col-span-2">
                <Input
                  placeholder="Ej: J-101"
                  value={form.nombre_salon || ''}
                  onChange={(e) => setForm({ ...form, nombre_salon: e.target.value })}
                />
              </FormField>

              {sheet.tipo === 'nuevo-salon' ? (
                <FormField label="Bloque" className="col-span-2">
                  <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/50 border border-border text-sm text-foreground">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    {form.nombre_bloque}
                  </div>
                </FormField>
              ) : (
                <FormField label="Bloque" required error={errors.nombre_bloque} className="col-span-2">
                  <Select
                    value={form.nombre_bloque || ''}
                    onChange={(e) => setForm({ ...form, nombre_bloque: e.target.value })}
                  >
                    <option value="">Seleccione un bloque...</option>
                    {bloques.map((b) => (
                      <option key={b._id} value={b.nombre_bloque}>
                        {b.nombre_bloque}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField
                label="Capacidad (estudiantes)"
                required
                error={errors.capacidad_estudiantes}
              >
                <Input
                  type="number"
                  min="1"
                  placeholder="Ej: 30"
                  value={form.capacidad_estudiantes || ''}
                  onChange={(e) => setForm({ ...form, capacidad_estudiantes: e.target.value })}
                />
              </FormField>

              <FormField label="Tipo de Silletería" required error={errors.tipo_silleteria}>
                <Input
                  placeholder="Ej: Universitaria"
                  value={form.tipo_silleteria || ''}
                  onChange={(e) => setForm({ ...form, tipo_silleteria: e.target.value })}
                />
              </FormField>
            </div>
          )}

          <SheetFooter>
            <Button variant="outline" onClick={closeSheet}>
              Cancelar
            </Button>
            <Button
              onClick={sheet.tipo?.includes('bloque') ? guardarBloque : guardarSalon}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : sheet.tipo?.startsWith('nuevo') ? 'Agregar' : 'Actualizar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
