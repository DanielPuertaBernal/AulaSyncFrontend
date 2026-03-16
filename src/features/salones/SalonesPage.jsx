import { useState } from 'react';
import DataTable from '@/shared/components/DataTable';
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
import { showSuccess, showError } from '@/shared/utils/alert';
import Swal from 'sweetalert2';

export default function SalonesPage() {
  const [seccion, setSeccion] = useState('bloques');
  const { data: salones = [], isLoading: loadingSalones } = useSalones();
  const { data: bloques = [], isLoading: loadingBloques } = useBloques();

  const crearSalon = useCrearSalon();
  const actualizarSalon = useActualizarSalon();
  const eliminarSalon = useEliminarSalon();
  const crearBloque = useCrearBloque();
  const actualizarBloque = useActualizarBloque();
  const eliminarBloque = useEliminarBloque();

  // ── BLOQUES ──────────────────────────────────────────────────
  async function abrirFormBloque(bloque = null) {
    const { value } = await Swal.fire({
      title: bloque ? 'Editar bloque' : 'Nuevo bloque',
      html: `
        <div style="text-align:left">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151">
            Nombre del Bloque
          </label>
          <input
            id="swal-bloque-nombre"
            class="swal2-input"
            style="margin:0;width:100%;box-sizing:border-box"
            placeholder="Ej: Bloque A"
            value="${bloque?.nombre_bloque || ''}"
          />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: bloque ? 'Actualizar' : 'Agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      focusConfirm: false,
      preConfirm: () => {
        const nombre = document.getElementById('swal-bloque-nombre').value.trim();
        if (!nombre) {
          Swal.showValidationMessage('El nombre del bloque es requerido');
          return false;
        }
        return { nombre_bloque: nombre };
      },
    });

    if (!value) return;
    try {
      if (bloque?._id) {
        await actualizarBloque.mutateAsync({ id: bloque._id, ...value });
        showSuccess('Bloque actualizado correctamente');
      } else {
        await crearBloque.mutateAsync(value);
        showSuccess('Bloque creado correctamente');
      }
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
    const { isConfirmed } = await Swal.fire({
      title: 'Eliminar bloque',
      text: `¿Desea eliminar el bloque ${bloque.nombre_bloque}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!isConfirmed) return;
    try {
      await eliminarBloque.mutateAsync(bloque._id);
      showSuccess('Bloque eliminado correctamente');
    } catch (e) {
      showError(e.response?.data?.message || 'Error al eliminar bloque');
    }
  }

  // ── SALONES ──────────────────────────────────────────────────
  async function abrirFormSalon(salon = null) {
    const bloquesOptions = bloques
      .map(
        (b) =>
          `<option value="${b.nombre_bloque}" ${
            salon?.nombre_bloque === b.nombre_bloque ? 'selected' : ''
          }>${b.nombre_bloque}</option>`
      )
      .join('');

    const { value } = await Swal.fire({
      title: salon ? 'Editar salón' : 'Nuevo salón',
      width: 560,
      html: `
        <div style="text-align:left;display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151">Nombre Salón</label>
            <input id="swal-salon-nombre" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box"
              placeholder="Ej: S-101" value="${salon?.nombre_salon || ''}" />
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151">Bloque</label>
            <select id="swal-salon-bloque" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box;background:#fff;height:42px">
              <option value="">Seleccione un bloque...</option>
              ${bloquesOptions}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151">Capacidad (estudiantes)</label>
            <input id="swal-salon-capacidad" class="swal2-input" type="number" min="1"
              style="margin:0;width:100%;box-sizing:border-box"
              placeholder="Ej: 30" value="${salon?.capacidad_estudiantes || ''}" />
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151">Tipo de Silletería</label>
            <input id="swal-salon-silleteria" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box"
              placeholder="Ej: Universitaria" value="${salon?.tipo_silleteria || ''}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: salon ? 'Actualizar' : 'Agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      focusConfirm: false,
      preConfirm: () => {
        const nombre_salon = document.getElementById('swal-salon-nombre').value.trim();
        const nombre_bloque = document.getElementById('swal-salon-bloque').value.trim();
        const cap = document.getElementById('swal-salon-capacidad').value.trim();
        const tipo_silleteria = document.getElementById('swal-salon-silleteria').value.trim();

        if (!nombre_salon) { Swal.showValidationMessage('El nombre del salón es requerido'); return false; }
        if (!nombre_bloque) { Swal.showValidationMessage('Seleccione un bloque'); return false; }
        if (!cap || Number(cap) < 1) { Swal.showValidationMessage('La capacidad debe ser mayor que 0'); return false; }
        if (!tipo_silleteria) { Swal.showValidationMessage('El tipo de silletería es requerido'); return false; }

        return { nombre_salon, nombre_bloque, capacidad_estudiantes: Number(cap), tipo_silleteria };
      },
    });

    if (!value) return;
    try {
      if (salon?._id) {
        await actualizarSalon.mutateAsync({ id: salon._id, ...value });
        showSuccess('Salón actualizado correctamente');
      } else {
        await crearSalon.mutateAsync(value);
        showSuccess('Salón creado correctamente');
      }
    } catch (e) {
      showError(e.response?.data?.message || 'Error al guardar salón');
    }
  }

  async function onEliminarSalon(salon) {
    const { isConfirmed } = await Swal.fire({
      title: 'Eliminar salón',
      text: `¿Desea eliminar el salón ${salon.nombre_salon}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!isConfirmed) return;
    try {
      await eliminarSalon.mutateAsync(salon._id);
      showSuccess('Salón eliminado correctamente');
    } catch (e) {
      showError(e.response?.data?.message || 'Error al eliminar salón');
    }
  }

  const bloqueColumns = [
    { key: 'nombre_bloque', label: 'Bloque' },
    {
      key: '_acciones',
      label: 'Acciones',
      className: 'text-center',
      render: (_v, row) => (
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => abrirFormBloque(row)}
            className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onEliminarBloque(row)}
            className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
          >
            Borrar
          </button>
        </div>
      ),
    },
  ];

  const salonColumns = [
    { key: 'nombre_salon', label: 'Salón' },
    { key: 'nombre_bloque', label: 'Bloque' },
    { key: 'capacidad_estudiantes', label: 'Estudiantes' },
    { key: 'tipo_silleteria', label: 'Silletería' },
    {
      key: '_acciones',
      label: 'Acciones',
      className: 'text-center',
      render: (_v, row) => (
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => abrirFormSalon(row)}
            className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onEliminarSalon(row)}
            className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
          >
            Borrar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── Título ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          <i className="fa-solid fa-school mr-2" />Gestión de Salones
        </h1>
      </div>

      {/* ── Tabs de navegación ── */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setSeccion('bloques')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            seccion === 'bloques'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fa-solid fa-building mr-1" />Bloques ({bloques.length})
        </button>
        <button
          onClick={() => setSeccion('salones')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            seccion === 'salones'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fa-solid fa-door-open mr-1" />Salones ({salones.length})
        </button>
      </div>

      {/* ── Sección activa: Bloques ── */}
      {seccion === 'bloques' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                <i className="fa-solid fa-building mr-2" />Bloques
              </h2>
              <p className="text-gray-500 text-sm">{bloques.length} registrados</p>
            </div>
            <button
              onClick={() => abrirFormBloque()}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              + Nuevo bloque
            </button>
          </div>
          <DataTable columns={bloqueColumns} data={bloques} loading={loadingBloques} searchable />
        </div>
      )}

      {/* ── Sección activa: Salones ── */}
      {seccion === 'salones' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                <i className="fa-solid fa-door-open mr-2" />Salones
              </h2>
              <p className="text-gray-500 text-sm">{salones.length} registrados</p>
            </div>
            <button
              onClick={() => abrirFormSalon()}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              + Nuevo salón
            </button>
          </div>
          <DataTable columns={salonColumns} data={salones} loading={loadingSalones} searchable />
        </div>
      )}

    </div>
  );
}
