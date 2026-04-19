import { useState } from 'react';
import { Key, CalendarDays } from 'lucide-react';
import LlavesPage from '@/features/llaves/LlavesPage';
import ReservasPage from '@/features/reservas/ReservasPage';

const TABS = [
  { key: 'llaves', label: 'Préstamos de Llaves', Icon: Key },
  { key: 'reservas', label: 'Reservas de Salones', Icon: CalendarDays },
];

export default function GestionSalonesPage() {
  const [tab, setTab] = useState('llaves');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'llaves' && <LlavesPage />}
      {tab === 'reservas' && <ReservasPage />}
    </div>
  );
}
