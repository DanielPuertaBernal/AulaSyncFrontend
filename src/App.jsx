import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import Layout from '@/shared/components/Layout';
import LoginPage from '@/features/auth/LoginPage';
import ProgramacionPage from '@/features/programacion/ProgramacionPage';
import LlavesPage from '@/features/llaves/LlavesPage';
import EquiposPage from '@/features/equipos/EquiposPage';
import PrestamosPage from '@/features/prestamos/PrestamosPage';
import HistorialPage from '@/features/historial/HistorialPage';
import UsuariosPage from '@/features/usuarios/UsuariosPage';
import NFCPage from '@/features/nfc/NFCPage';
import PerfilPage from '@/features/perfil/PerfilPage';
import { ROLES } from '@/shared/constants';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas con layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/programacion" replace />} />
            <Route path="/programacion" element={<ProgramacionPage />} />
            <Route path="/llaves" element={<LlavesPage />} />
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/prestamos" element={<PrestamosPage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="/nfc" element={<NFCPage />} />
            <Route path="/perfil" element={<PerfilPage />} />

            {/* Solo ADMIN */}
            <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
              <Route path="/usuarios" element={<UsuariosPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
