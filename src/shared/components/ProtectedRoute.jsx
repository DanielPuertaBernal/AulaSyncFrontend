import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

/**
 * Protege rutas: redirige a /login si no hay sesión.
 * Si se pasan `roles`, verifica que el usuario los tenga.
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, usuario } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && roles.length && !roles.includes(usuario?.rol)) {
    return <Navigate to="/programacion" replace />;
  }

  return <Outlet />;
}
