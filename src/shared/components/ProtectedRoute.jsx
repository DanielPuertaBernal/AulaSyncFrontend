import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

/**
 * Protege rutas: redirige a /login si no hay sesión.
 * Si se pasan `roles`, verifica que el usuario los tenga.
 */
export default function ProtectedRoute({ roles }) {
  const {
    isAuthenticated,
    usuario,
    token,
    refreshToken,
    isHydrating,
    hasHydrated,
    restoreSession,
  } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !token && refreshToken) {
      restoreSession();
    }
  }, [hasHydrated, token, refreshToken, restoreSession]);

  if (!hasHydrated || isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-600">
          <i className="fa-solid fa-spinner fa-spin mr-2" />Restaurando sesión...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && roles.length && !roles.includes(usuario?.rol)) {
    return <Navigate to="/programacion" replace />;
  }

  return <Outlet />;
}
