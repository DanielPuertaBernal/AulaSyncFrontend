import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import { ROLES } from '@/shared/constants';

const adminLinks = [
  { to: '/programacion', label: '📅 Programación' },
  { to: '/usuarios', label: '👥 Usuarios' },
  { to: '/equipos', label: '🖥️ Equipos' },
  { to: '/historial', label: '📊 Historial' },
];

const auxLinks = [
  { to: '/programacion', label: '📅 Programación' },
  { to: '/llaves', label: '🔑 Llaves' },
  { to: '/equipos', label: '🖥️ Equipos' },
  { to: '/prestamos', label: '📦 Préstamos' },
  { to: '/historial', label: '📊 Historial' },
  { to: '/nfc', label: '📡 NFC' },
];

export default function Layout() {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();

  const links = usuario?.rol === ROLES.ADMIN ? adminLinks : auxLinks;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-primary-dark flex flex-col shadow-lg">
        <div className="px-5 py-6 border-b border-blue-800">
          <h1 className="text-white font-bold text-lg leading-tight">🔑 Control de Llaves</h1>
          <p className="text-blue-300 text-xs mt-1 truncate">{usuario?.nombre}</p>
          <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full mt-1 inline-block">
            {usuario?.rol === ROLES.ADMIN ? 'Administrador' : 'Auxiliar'}
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ to, label }) => (
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
              {label}
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
            👤 Mi Perfil
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-800 hover:text-white transition-colors"
          >
            🚪 Cerrar Sesión
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
