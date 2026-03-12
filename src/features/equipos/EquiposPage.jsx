import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import DataTable from '@/shared/components/DataTable';
import {
  useEquipos,
  useCrearEquipo,
  useActualizarEquipo,
  useEliminarEquipo,
} from './equiposApi';
import { usePrestamosAbiertos } from '@/features/prestamos/prestamosApi';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';

function sanitizeFileName(name) {
  return String(name || 'barcode').replace(/[^a-zA-Z0-9-_]/g, '_');
}

function buildBarcodeCanvas(codigo) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, codigo, {
    format: 'CODE128',
    displayValue: true,
    fontSize: 16,
    height: 70,
    width: 2,
    margin: 10,
  });
  return canvas;
}

export default function EquiposPage() {
  const [showForm, setShowForm] = useState(false);
  const [equipoEditando, setEquipoEditando] = useState(null);

  const { data: equipos = [], isLoading } = useEquipos();
  const { data: prestamosAbiertos = [] } = usePrestamosAbiertos();
  const crear = useCrearEquipo();
  const actualizar = useActualizarEquipo();
  const eliminar = useEliminarEquipo();

  const equiposConEstado = useMemo(() => {
    const prestadoPorEquipo = new Map();

    for (const prestamo of prestamosAbiertos) {
      for (const eq of prestamo.equipos || []) {
        if (eq.estado_equipo !== 'entregado') continue;
        const id = String(eq.equipo_id || '');
        if (!id) continue;
        if (!prestadoPorEquipo.has(id)) {
          prestadoPorEquipo.set(id, prestamo.docente_nombre || 'Docente');
        }
      }
    }

    return equipos.map((eq) => {
      const docentePrestamo = prestadoPorEquipo.get(String(eq._id));
      return {
        ...eq,
        estado_operativo: docentePrestamo ? 'en_prestamo' : 'activo',
        docente_prestamo: docentePrestamo || '',
      };
    });
  }, [equipos, prestamosAbiertos]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nombre: '',
      marca: '',
      consecutivo: '',
      codigo_inventario: '',
      descripcion: '',
      estado: 'activo',
    },
  });

  function abrirNuevo() {
    setEquipoEditando(null);
    setShowForm((prev) => {
      const next = !prev;
      if (next) {
        reset({
          nombre: '',
          marca: '',
          consecutivo: '',
          codigo_inventario: '',
          descripcion: '',
          estado: 'activo',
        });
      }
      return next;
    });
  }

  function abrirEdicion(equipo) {
    setEquipoEditando(equipo);
    setShowForm(true);
    reset({
      nombre: equipo.nombre || '',
      marca: equipo.marca || '',
      consecutivo: equipo.consecutivo ?? '',
      codigo_inventario: equipo.codigo_inventario || '',
      descripcion: equipo.descripcion || '',
      estado: equipo.estado || 'activo',
    });
  }

  function cerrarFormulario() {
    setShowForm(false);
    setEquipoEditando(null);
    reset({
      nombre: '',
      marca: '',
      consecutivo: '',
      codigo_inventario: '',
      descripcion: '',
      estado: 'activo',
    });
  }

  async function onGuardar(data) {
    try {
      const payload = {
        nombre: data.nombre,
        marca: data.marca || '',
        consecutivo: data.consecutivo,
        codigo_inventario: data.codigo_inventario,
        descripcion: data.descripcion || '',
      };

      if (equipoEditando) {
        await actualizar.mutateAsync({
          id: equipoEditando._id,
          ...payload,
          estado: data.estado,
        });
        showSuccess('Equipo actualizado correctamente');
      } else {
        await crear.mutateAsync(payload);
        showSuccess('Equipo registrado correctamente');
      }

      cerrarFormulario();
    } catch (err) {
      showError(err.response?.data?.message || 'No se pudo guardar el equipo');
    }
  }

  async function onEliminar(equipo) {
    const confirm = await showConfirm(
      'Eliminar equipo',
      `¿Seguro que desea eliminar el equipo ${equipo.nombre}?`
    );
    if (!confirm.isConfirmed) return;

    try {
      await eliminar.mutateAsync(equipo._id);
      showSuccess('Equipo eliminado correctamente');
      if (equipoEditando?._id === equipo._id) {
        cerrarFormulario();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'No se pudo eliminar el equipo');
    }
  }

  function onDescargarPng(equipo) {
    try {
      const canvas = buildBarcodeCanvas(equipo.codigo_barras);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${sanitizeFileName(equipo.codigo_barras)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      showError('No se pudo generar el PNG del código de barras');
    }
  }

  function onDescargarPdf(equipo) {
    try {
      const canvas = buildBarcodeCanvas(equipo.codigo_barras);
      const imgData = canvas.toDataURL('image/png');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(14);
      doc.text(`Equipo: ${equipo.nombre}`, 20, 20);
      doc.setFontSize(11);
      doc.text(`Codigo de barras: ${equipo.codigo_barras}`, 20, 28);

      const maxWidth = 170;
      const imgHeight = (canvas.height * maxWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', 20, 34, maxWidth, imgHeight);
      doc.save(`${sanitizeFileName(equipo.codigo_barras)}.pdf`);
    } catch {
      showError('No se pudo generar el PDF del código de barras');
    }
  }

  async function onExportarBarcode(equipo) {
    const result = await Swal.fire({
      title: 'Exportar código de barras',
      text: `Seleccione el formato para ${equipo.nombre}`,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'PNG',
      denyButtonText: 'PDF',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      denyButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
    });

    if (result.isConfirmed) {
      onDescargarPng(equipo);
      return;
    }

    if (result.isDenied) {
      onDescargarPdf(equipo);
    }
  }

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'marca', label: 'Marca' },
    { key: 'codigo_inventario', label: 'Código Inventario' },
    { key: 'codigo_barras', label: 'Código Barras' },
    { key: 'consecutivo', label: 'Consecutivo' },
    {
      key: 'estado',
      label: 'Estado',
      render: (_v, row) => (
        <div className="flex flex-col items-center gap-1">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              row.estado_operativo === 'en_prestamo'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {row.estado_operativo === 'en_prestamo' ? 'en préstamo' : 'activo'}
          </span>
          {row.docente_prestamo && (
            <span className="text-xs text-gray-600 leading-tight">
              {row.docente_prestamo}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      className: 'whitespace-nowrap',
      render: (_v, row) => (
        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => abrirEdicion(row)}
            className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
            title="Editar equipo"
          >
            <i className="fa-solid fa-pen mr-1" />Editar
          </button>
          <button
            onClick={() => onEliminar(row)}
            className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 hover:bg-red-200"
            title="Eliminar equipo"
          >
            <i className="fa-solid fa-trash mr-1" />Eliminar
          </button>
          <button
            onClick={() => onExportarBarcode(row)}
            className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
            title="Exportar código de barras"
          >
            <i className="fa-solid fa-download mr-1" />Exportar
          </button>
        </div>
      ),
    },
  ];

  const guardando = crear.isPending || actualizar.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-desktop mr-2" />Equipos</h1>
          <p className="text-gray-500 text-sm">{equipos.length} equipos en inventario</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          {showForm && !equipoEditando ? 'Cancelar' : '+ Nuevo Equipo'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-xl">
          <h2 className="font-semibold text-gray-800 mb-4">
            {equipoEditando ? 'Editar equipo' : 'Registrar nuevo equipo'}
          </h2>
          <form onSubmit={handleSubmit(onGuardar)} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo</label>
              <input
                {...register('nombre', { required: 'Nombre del equipo es requerido' })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input
                {...register('marca')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consecutivo</label>
                <input
                  type="number"
                  {...register('consecutivo', { required: 'Consecutivo es requerido' })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.consecutivo && <p className="text-red-500 text-xs mt-1">{errors.consecutivo.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de inventario</label>
                <input
                  {...register('codigo_inventario', { required: 'Código de inventario es requerido' })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.codigo_inventario && (
                  <p className="text-red-500 text-xs mt-1">{errors.codigo_inventario.message}</p>
                )}
              </div>
            </div>

            {equipoEditando && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  {...register('estado')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="activo">activo</option>
                  <option value="inactivo">inactivo</option>
                  <option value="mantenimiento">mantenimiento</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                {...register('descripcion')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : equipoEditando ? 'Guardar cambios' : 'Registrar equipo'}
              </button>
              <button
                type="button"
                onClick={cerrarFormulario}
                className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <DataTable
          columns={columns}
          data={equiposConEstado}
          loading={isLoading}
          searchable
          exportable
          exportFileName="equipos"
        />
      )}
    </div>
  );
}
