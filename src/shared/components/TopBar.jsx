import { useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/shared/components/ThemeProvider';
import { cn } from '@/shared/lib/utils';

const breadcrumbMap = {
  '/programacion': 'Programación',
  '/comunidad': 'Comunidad',
  '/salones': 'Salones',
  '/ubicaciones': 'Ubicaciones',
  '/usuarios': 'Usuarios',
  '/equipos': 'Equipos',
  '/historial': 'Historial',
  '/llaves': 'Préstamos Individuales',
  '/prestamos': 'Préstamos',
  '/nfc': 'NFC',
  '/monitores': 'Monitores',
  '/perfil': 'Mi Perfil',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();
  const pageTitle = breadcrumbMap[pathname] || '';

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-border bg-card">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">AulaSync</span>
        {pageTitle && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium text-foreground">{pageTitle}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    </header>
  );
}
