import DataTable from '@/shared/components/DataTable';
import {
  useUbicaciones,
  useCrearUbicacion,
  useActualizarUbicacion,
  useEliminarUbicacion,
} from './ubicacionesApi';
import { showError, showSuccess } from '@/shared/utils/alert';
import Swal from 'sweetalert2';

function EstadoBadge({ active }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
      {active ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function PermisosCell({ ubicacion }) {
  const permisos = [
    ubicacion.permite_identificacion && 'Identificación',
    ubicacion.permite_prestamo_llaves && 'Préstamo llaves',
    ubicacion.permite_devolucion_llaves && 'Devolución llaves',
    ubicacion.permite_prestamo_equipos && 'Préstamo equipos',
  ].filter(Boolean);

  if (!permisos.length) {
    return <span className="text-xs text-gray-500">Sin permisos operativos</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {permisos.map((permiso) => (
        <span key={permiso} className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-700">
          {permiso}
        </span>
      ))}
    </div>
  );
}

function buildCheckboxRow(id, label, checked) {
  return `
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151">
      <input id="${id}" type="checkbox" ${checked ? 'checked' : ''} />
      ${label}
    </label>
  `;
}

export default function UbicacionesPage() {
  const { data: ubicaciones = [], isLoading } = useUbicaciones({ incluirInactivas: true });
  const crear = useCrearUbicacion();
  const actualizar = useActualizarUbicacion();
  const eliminar = useEliminarUbicacion();

  async function abrirFormulario(ubicacion = null) {
    const { value } = await Swal.fire({
      title: ubicacion ? 'Editar ubicación operativa' : 'Nueva ubicación operativa',
      width: 620,
      html: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:left">
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151">Clave</label>
            <input id="swal-ubic-clave" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box"
              placeholder="Ej: porteria_inferior" value="${ubicacion?.clave || ''}" ${ubicacion ? 'disabled' : ''} />
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151">Nombre</label>
            <input id="swal-ubic-nombre" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box"
              placeholder="Ej: Portería Inferior" value="${ubicacion?.nombre || ''}" />
          </div>
          <div style="grid-column:1 / span 2">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151">Descripción</label>
            <textarea id="swal-ubic-descripcion" class="swal2-textarea" style="margin:0;width:100%;box-sizing:border-box;height:80px" placeholder="Descripción operativa">${ubicacion?.descripcion || ''}</textarea>
          </div>
          <div style="grid-column:1 / span 2;display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#f9fafb;padding:12px;border-radius:10px">
            ${buildCheckboxRow('swal-ubic-activa', 'Ubicación activa', ubicacion?.activa ?? true)}
            ${buildCheckboxRow('swal-ubic-identificacion', 'Permite identificación NFC', ubicacion?.permite_identificacion ?? false)}
            ${buildCheckboxRow('swal-ubic-prestamo-llaves', 'Permite préstamo de llaves', ubicacion?.permite_prestamo_llaves ?? false)}
            ${buildCheckboxRow('swal-ubic-devolucion-llaves', 'Permite devolución de llaves', ubicacion?.permite_devolucion_llaves ?? false)}
            ${buildCheckboxRow('swal-ubic-prestamo-equipos', 'Permite préstamo de equipos', ubicacion?.permite_prestamo_equipos ?? false)}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: ubicacion ? 'Guardar cambios' : 'Crear ubicación',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      focusConfirm: false,
      preConfirm: () => {
        const clave = document.getElementById('swal-ubic-clave').value.trim();
        const nombre = document.getElementById('swal-ubic-nombre').value.trim();
        const descripcion = document.getElementById('swal-ubic-descripcion').value.trim();

        if (!ubicacion && !clave) {
          Swal.showValidationMessage('La clave es requerida');
          return false;
        }
        if (!nombre) {
          Swal.showValidationMessage('El nombre es requerido');
          return false;
        }

        return {
          ...(ubicacion ? {} : { clave }),
          nombre,
          descripcion,
          activa: document.getElementById('swal-ubic-activa').checked,
          permite_identificacion: document.getElementById('swal-ubic-identificacion').checked,
          permite_prestamo_llaves: document.getElementById('swal-ubic-prestamo-llaves').checked,
          permite_devolucion_llaves: document.getElementById('swal-ubic-devolucion-llaves').checked,
          permite_prestamo_equipos: document.getElementById('swal-ubic-prestamo-equipos').checked,
        };
      },
    });

    if (!value) return;

    try {
      if (ubicacion?._id) {
        await actualizar.mutateAsync({ id: ubicacion._id, ...value });
        showSuccess('Ubicación actualizada correctamente');
      } else {
        await crear.mutateAsync(value);
        showSuccess('Ubicación creada correctamente');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'No se pudo guardar la ubicación');
    }
  }

  async function onEliminar(ubicacion) {
    const { isConfirmed } = await Swal.fire({
      title: 'Eliminar ubicación',
      text: `¿Desea eliminar la ubicación ${ubicacion.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });

    if (!isConfirmed) return;

    try {
      await eliminar.mutateAsync(ubicacion._id);
      showSuccess('Ubicación eliminada correctamente');
    } catch (error) {
      showError(error.response?.data?.message || 'No se pudo eliminar la ubicación');
    }
  }

  const columns = [
    { key: 'clave', label: 'Clave' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'activa',
      label: 'Estado',
      render: (value) => <EstadoBadge active={Boolean(value)} />,
    },
    {
      key: '_permisos',
      label: 'Permisos',
      render: (_value, row) => <PermisosCell ubicacion={row} />,
    },
    {
      key: '_acciones',
      label: 'Acciones',
      className: 'text-center',
      render: (_value, row) => (
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => abrirFormulario(row)}
            className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onEliminar(row)}
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            <i className="fa-solid fa-location-dot mr-2" />Ubicaciones operativas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Administra los puntos autorizados para identificación NFC, préstamo y devolución de llaves.
          </p>
        </div>
        <button
          onClick={() => abrirFormulario()}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          + Nueva ubicación
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
        Solo el <strong>administrador</strong> puede crear, editar, activar o eliminar estos puntos operativos.
      </div>

      <DataTable columns={columns} data={ubicaciones} loading={isLoading} searchable />
    </div>
  );
}
