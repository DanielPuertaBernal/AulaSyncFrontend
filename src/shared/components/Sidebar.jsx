import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  GraduationCap,
  School,
  MapPin,
  Users,
  UsersRound,
  Monitor,
  BarChart3,
  Key,
  Package,
  Radio,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ROLES } from '@/shared/constants';

const adminLinks = [
  { to: '/programacion', icon: CalendarDays, label: 'Programación' },
  { to: '/comunidad', icon: UsersRound, label: 'Comunidad' },
  { to: '/salones', icon: School, label: 'Salones' },
  { to: '/ubicaciones', icon: MapPin, label: 'Ubicaciones' },
  { to: '/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/equipos', icon: Monitor, label: 'Equipos' },
  { to: '/historial', icon: BarChart3, label: 'Historial' },
];

const auxLinks = [
  { to: '/programacion', icon: CalendarDays, label: 'Programación' },
  { to: '/llaves', icon: Key, label: 'Préstamos Individuales' },
  { to: '/equipos', icon: Monitor, label: 'Equipos' },
  { to: '/prestamos', icon: Package, label: 'Préstamos' },
  { to: '/historial', icon: BarChart3, label: 'Historial' },
  { to: '/nfc', icon: Radio, label: 'NFC' },
  { to: '/monitores', icon: GraduationCap, label: 'Monitores' },
];

export default function Sidebar({ usuario, collapsed, onToggle, onLogout }) {
  const links = usuario?.rol === ROLES.ADMIN ? adminLinks : auxLinks;

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-bold text-sm">
            AS
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-semibold text-sidebar-accent-foreground text-sm leading-tight truncate">
                AulaSync
              </h1>
              <p className="text-xs text-sidebar-foreground/70 truncate mt-0.5">
                {usuario?.nombre}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <span className="text-[11px] bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 rounded-full mt-2 inline-block">
            {usuario?.rol === ROLES.ADMIN ? 'Administrador' : 'Auxiliar'}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        <NavLink
          to="/perfil"
          title={collapsed ? 'Mi Perfil' : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            )
          }
        >
          <UserCircle className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Mi Perfil</span>}
        </NavLink>
        <button
          onClick={onLogout}
          title={collapsed ? 'Cerrar Sesión' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            'text-destructive/80 hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full mt-2 py-1.5 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/30 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
