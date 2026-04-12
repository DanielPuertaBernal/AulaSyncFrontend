import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { authApi } from './authApi';
import { KeyRound } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/90 to-primary-dark">
      <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-border">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 text-primary"><KeyRound className="h-12 w-12 mx-auto" /></div>
          <h1 className="text-2xl font-bold text-foreground">Control de Llaves</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema UCO</p>
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
