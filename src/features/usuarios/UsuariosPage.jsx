import { useState } from 'react';
import { useForm } from 'react-hook-form';
import DataTable from '@/shared/components/DataTable';
import { useUsuarios, useCrearUsuario, useCambiarEstadoUsuario } from './usuariosApi';
import { ROLES } from '@/shared/constants';
import { showSuccess, showError } from '@/shared/utils/alert';

const COLS = [
  { key: 'usuario', label: 'Usuario' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'email', label: 'Email' },
  { key: 'contacto', label: 'Contacto' },
  {
    key: 'rol',
    label: 'Rol',
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v === ROLES.ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
        {v === ROLES.ADMIN ? 'Admin' : 'Auxiliar'}
      </span>
    ),
  },
  {
    key: 'activo',
    label: 'Estado',
    render: (v, row) => <EstadoToggle activo={v} username={row.usuario} />,
  },
];

function EstadoToggle({ activo, username }) {
  const cambiar = useCambiarEstadoUsuario();
  return (
    <button
      onClick={() => cambiar.mutate({ username, activo: !activo })}
      disabled={cambiar.isPending}
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${activo ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </button>
  );
}

export default function UsuariosPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: usuarios = [], isLoading } = useUsuarios();
  const crear = useCrearUsuario();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  async function onCrear(data) {
    try {
      await crear.mutateAsync(data);
      reset();
      setShowForm(false);
      showSuccess('Usuario creado correctamente');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 409) {
        showError(msg || 'El usuario o correo ya existe');
      } else if (status === 400) {
        showError(msg || 'Datos inválidos. Revise los campos del formulario.');
      } else if (!err.response) {
        showError('Sin conexión al servidor. Verifique su red.');
      } else {
        showError(msg || 'No se pudo crear el usuario. Intente nuevamente.');
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-users mr-2" />Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm">{usuarios.length} usuarios</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark">
          {showForm ? 'Cancelar' : '+ Nuevo Auxiliar'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg">
          <h2 className="font-semibold text-gray-800 mb-4">Crear usuario auxiliar</h2>
          <form onSubmit={handleSubmit(onCrear)} className="space-y-3">
            {[
              { name: 'usuario', label: 'Usuario', required: true },
              { name: 'nombre', label: 'Nombre completo', required: true },
              { name: 'email', label: 'Email', required: true, type: 'email' },
              { name: 'contacto', label: 'Teléfono' },
              { name: 'password', label: 'Contraseña', required: true, type: 'password' },
            ].map(({ name, label, required, type = 'text' }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  {...register(name, required ? { required: `${label} es requerido` } : {})}
                  type={type}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
              </div>
            ))}
            <button type="submit" disabled={crear.isPending} className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-60">
              {crear.isPending ? 'Creando...' : 'Crear Usuario'}
            </button>
          </form>
        </div>
      )}

      <DataTable columns={COLS} data={usuarios} loading={isLoading} searchable />
    </div>
  );
}
