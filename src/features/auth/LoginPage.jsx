import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { authApi } from './authApi';
import { KeyRound, BookOpen } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { FormField, Input } from '@/shared/components/ui/FormField';

const loginSchema = z.object({
  usuario: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, isHydrating } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !isHydrating) {
      navigate('/programacion', { replace: true });
    }
  }, [isAuthenticated, isHydrating, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data) {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(data);
      login(res.data.data);
      navigate('/programacion', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary-dark to-primary">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center space-y-6">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">AulaSync</h1>
            <p className="mt-2 text-lg text-white/80">Sistema de Control de Llaves</p>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Gestión de préstamos de llaves, reservas de salones y control de equipos para la comunidad universitaria.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md border border-border">
          <div className="text-center mb-8">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 lg:hidden">
              <KeyRound className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Iniciar sesión</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Usuario" error={errors.usuario?.message}>
              <Input
                {...register('usuario')}
                type="text"
                autoComplete="username"
                placeholder="nombre_usuario"
              />
            </FormField>

            <FormField label="Contraseña" error={errors.password?.message}>
              <Input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </FormField>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
