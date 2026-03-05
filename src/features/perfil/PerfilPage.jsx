import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/features/auth/authStore';
import { usuariosApi } from '@/features/usuarios/usuariosApi';
import { showSuccess, showError } from '@/shared/utils/alert';

export default function PerfilPage() {
  const { usuario, updateUsuario } = useAuthStore();
  const [tab, setTab] = useState('perfil');

  const perfilForm = useForm({ defaultValues: { nombre: usuario?.nombre, email: usuario?.email, contacto: usuario?.contacto } });
  const passForm = useForm();

  async function onEditarPerfil(data) {
    try {
      const res = await usuariosApi.editarPerfil(data);
      updateUsuario(res.data.data.usuario);
      showSuccess('Perfil actualizado correctamente');
    } catch (e) {
      showError(e.response?.data?.message || 'Error al actualizar perfil');
    }
  }

  async function onCambiarContrasena(data) {
    if (data.passwordNueva !== data.confirmar) {
      showError('Las contraseñas no coinciden');
      return;
    }
    try {
      await usuariosApi.cambiarContrasena({ passwordActual: data.passwordActual, passwordNueva: data.passwordNueva });
      passForm.reset();
      showSuccess('Contraseña cambiada exitosamente');
    } catch (e) {
      showError(e.response?.data?.message || 'Error al cambiar contraseña');
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-user mr-2" />Mi Perfil</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-semibold text-blue-800">{usuario?.nombre}</p>
        <p className="text-sm text-blue-600">@{usuario?.usuario}</p>
        <p className="text-sm text-blue-600">{usuario?.email}</p>
        <span className="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full mt-1 inline-block">{usuario?.rol}</span>
      </div>

      <div className="flex gap-1 border-b">
        {['perfil', 'contraseña'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'perfil' ? <><i className="fa-solid fa-pen-to-square mr-1" />Editar Perfil</> : <><i className="fa-solid fa-lock mr-1" />Cambiar Contraseña</>}
          </button>
        ))}
      </div>

      {tab === 'perfil' && (
        <form onSubmit={perfilForm.handleSubmit(onEditarPerfil)} className="bg-white rounded-lg shadow p-5 space-y-3">
          {[['nombre', 'Nombre'], ['email', 'Email'], ['contacto', 'Teléfono']].map(([name, label]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input {...perfilForm.register(name)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          ))}
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark">Guardar cambios</button>
        </form>
      )}

      {tab === 'contraseña' && (
        <form onSubmit={passForm.handleSubmit(onCambiarContrasena)} className="bg-white rounded-lg shadow p-5 space-y-3">
          {[['passwordActual', 'Contraseña actual'], ['passwordNueva', 'Nueva contraseña'], ['confirmar', 'Confirmar nueva contraseña']].map(([name, label]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input {...passForm.register(name, { required: true })} type="password" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          ))}
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark">Cambiar contraseña</button>
        </form>
      )}
    </div>
  );
}
