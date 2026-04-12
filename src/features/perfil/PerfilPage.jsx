import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/features/auth/authStore';
import { usuariosApi } from '@/features/usuarios/usuariosApi';
import { showSuccess, showError } from '@/shared/utils/alert';
import { User, Pencil, Lock } from 'lucide-react';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Button from '@/shared/components/ui/Button';
import { FormField, Input } from '@/shared/components/ui/FormField';
import { cn } from '@/shared/lib/utils';

export default function PerfilPage() {
  const { usuario, updateUsuario } = useAuthStore();
  const [tab, setTab] = useState('perfil');

  const perfilForm = useForm({ defaultValues: { nombre: usuario?.nombre, email: usuario?.email, contacto: usuario?.contacto } });
  const passForm = useForm();
  const tabs = [
    { id: 'perfil', label: 'Editar Perfil', icon: Pencil },
    { id: 'contraseña', label: 'Cambiar Contraseña', icon: Lock },
  ];

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
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <User className="h-6 w-6" />
        Mi Perfil
      </h1>

      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 max-w-lg">
        <p className="font-semibold text-foreground">{usuario?.nombre}</p>
        <p className="text-sm text-muted-foreground">@{usuario?.usuario}</p>
        <p className="text-sm text-muted-foreground">{usuario?.email}</p>
        <StatusBadge variant="info" className="mt-1">{usuario?.rol}</StatusBadge>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors',
                tab === t.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'perfil' && (
        <form onSubmit={perfilForm.handleSubmit(onEditarPerfil)} className="bg-card border border-border rounded-lg p-5 space-y-3 max-w-lg">
          {[['nombre', 'Nombre'], ['email', 'Email'], ['contacto', 'Teléfono']].map(([name, label]) => (
            <FormField key={name} label={label}>
              <Input {...perfilForm.register(name)} />
            </FormField>
          ))}
          <Button type="submit" className="w-full">Guardar cambios</Button>
        </form>
      )}

      {tab === 'contraseña' && (
        <form onSubmit={passForm.handleSubmit(onCambiarContrasena)} className="bg-card border border-border rounded-lg p-5 space-y-3 max-w-lg">
          {[['passwordActual', 'Contraseña actual'], ['passwordNueva', 'Nueva contraseña'], ['confirmar', 'Confirmar nueva contraseña']].map(([name, label]) => (
            <FormField key={name} label={label}>
              <Input {...passForm.register(name, { required: true })} type="password" />
            </FormField>
          ))}
          <Button type="submit" className="w-full">Cambiar contraseña</Button>
        </form>
      )}
    </div>
  );
}
