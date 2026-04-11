import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { authApi } from '@/features/auth/authApi';
import { useAuthStore } from '@/features/auth/authStore';
import { ROLES } from '@/shared/constants';

const adminLinks = [
  { to: '/programacion', icon: 'fa-solid fa-calendar-days', label: 'Programación' },
  { to: '/docentes', icon: 'fa-solid fa-chalkboard-user', label: 'Docentes' },
  { to: '/salones', icon: 'fa-solid fa-school', label: 'Salones' },
  { to: '/ubicaciones', icon: 'fa-solid fa-location-dot', label: 'Ubicaciones' },
  { to: '/usuarios', icon: 'fa-solid fa-users', label: 'Usuarios' },
  { to: '/equipos', icon: 'fa-solid fa-desktop', label: 'Equipos' },
  { to: '/historial', icon: 'fa-solid fa-chart-column', label: 'Historial' },
];

const auxLinks = [
  { to: '/programacion', icon: 'fa-solid fa-calendar-days', label: 'Programación' },
  { to: '/llaves', icon: 'fa-solid fa-key', label: 'Préstamos Individuales' },
  { to: '/equipos', icon: 'fa-solid fa-desktop', label: 'Equipos' },
  { to: '/prestamos', icon: 'fa-solid fa-box', label: 'Préstamos' },
  { to: '/historial', icon: 'fa-solid fa-chart-column', label: 'Historial' },
  { to: '/nfc', icon: 'fa-solid fa-tower-broadcast', label: 'NFC' },
  { to: '/monitores', icon: 'fa-solid fa-user-graduate', label: 'Monitores' },
];

export default function Layout() {
  const { usuario, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const links = usuario?.rol === ROLES.ADMIN ? adminLinks : auxLinks;

  async function handleLogout() {
    try {
      await authApi.logout(refreshToken);
    } catch (_) {
      // Si el backend no responde, igual limpiamos la sesión local.
    } finally {
      logout();
      navigate('/login');
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-primary-dark flex flex-col shadow-lg">
        <div className="px-5 py-6 border-b border-blue-800">
          <h1 className="text-white font-bold text-lg leading-tight"><i className="fa-solid fa-key mr-2" />Control de Llaves</h1>
          <p className="text-blue-300 text-xs mt-1 truncate">{usuario?.nombre}</p>
          <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full mt-1 inline-block">
            {usuario?.rol === ROLES.ADMIN ? 'Administrador' : 'Auxiliar'}
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                }`
              }
            >
              <i className={`${icon} mr-2`} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-blue-800 space-y-1">
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`
            }
          >
            <i className="fa-solid fa-user mr-2" />Mi Perfil
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-800 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket mr-2" />Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
