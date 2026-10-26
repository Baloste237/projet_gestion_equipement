import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { UsersPage } from './pages/users/UsersPage';
import { DepartmentsPage } from './pages/departments/DepartmentsPage';
import { PositionsPage } from './pages/positions/PositionsPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { EquipmentsPage } from './pages/equipments/EquipmentsPage';
import { EquipmentDetailPage } from './pages/equipments/EquipmentDetailPage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { InventoriesPage } from './pages/inventories/InventoriesPage';
import { AuditPage } from './pages/audit/AuditPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { EquipmentLabelsPage } from './pages/equipments/EquipmentLabelsPage';
import { ScanPage } from './pages/scan/ScanPage';
import { PublicEquipmentPage } from './pages/public/PublicEquipmentPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NotFoundPage } from './pages/errors/NotFoundPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Fiche publique ouverte par scan d'un QR code */}
        <Route path="/e/:id" element={<PublicEquipmentPage />} />

        {/* Routes protégées accessibles à tous les utilisateurs authentifiés */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <ScanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipments"
          element={
            <ProtectedRoute>
              <EquipmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipments/:id"
          element={
            <ProtectedRoute>
              <EquipmentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute>
              <AssignmentsPage />
            </ProtectedRoute>
          }
        />

        {/* Routes protégées avec restriction de rôles */}
        <Route
          path="/equipments/labels"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RESPONSABLE']}>
              <EquipmentLabelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RESPONSABLE']}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RESPONSABLE']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RESPONSABLE']}>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/positions"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RESPONSABLE']}>
              <PositionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventories"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RESPONSABLE', 'AUDITEUR']}>
              <InventoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RESPONSABLE', 'AUDITEUR']}>
              <AuditPage />
            </ProtectedRoute>
          }
        />

        {/* Route d'échappement 404 personnalisée */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;

