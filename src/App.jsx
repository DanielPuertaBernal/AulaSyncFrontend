import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import Layout from '@/shared/components/Layout';
import LoginPage from '@/features/auth/LoginPage';
import ProgramacionPage from '@/features/programacion/ProgramacionPage';
import GestionSalonesPage from '@/features/gestion-salones/GestionSalonesPage';
import EquiposPage from '@/features/equipos/EquiposPage';
import PrestamosPage from '@/features/prestamos/PrestamosPage';
import HistorialPage from '@/features/historial/HistorialPage';
import UsuariosPage from '@/features/usuarios/UsuariosPage';
import ComunidadPage from '@/features/comunidad/ComunidadPage';
import NFCPage from '@/features/nfc/NFCPage';
import MonitoresPage from '@/features/monitores/MonitoresPage';
import PerfilPage from '@/features/perfil/PerfilPage';
import SalonesPage from '@/features/salones/SalonesPage';
import UbicacionesPage from '@/features/ubicaciones/UbicacionesPage';
import NotificacionesPage from '@/features/notificaciones/NotificacionesPage';
import ConfiguracionPage from '@/features/configuracion/ConfiguracionPage';
import NovedadesPage from '@/features/novedades/NovedadesPage';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { ROLES } from '@/shared/constants';
import NotificacionesTab from '@/features/llaves/NotificacionesTab';

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas con layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/programacion" replace />} />
            <Route path="/programacion" element={<ProgramacionPage />} />
            <Route path="/gestion-salones" element={<GestionSalonesPage />} />
            <Route path="/llaves" element={<Navigate to="/gestion-salones" replace />} />
            <Route path="/reservas" element={<Navigate to="/gestion-salones" replace />} />
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/prestamos" element={<PrestamosPage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="/nfc" element={<NFCPage />} />
            <Route path="/monitores" element={<MonitoresPage />} />
            <Route path="/notificaciones" element={<NotificacionesPage />} />
            <Route path="/novedades" element={<NovedadesPage />} />
            <Route path="/perfil" element={<PerfilPage />} />

            {/* Solo ADMIN */}
            <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/comunidad" element={<ComunidadPage />} />
              <Route path="/salones" element={<SalonesPage />} />
              <Route path="/ubicaciones" element={<UbicacionesPage />} />
              <Route path="/notificaciones-llaves" element={<NotificacionesTab />} />
              <Route path="/configuracion" element={<ConfiguracionPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
