import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { UsersPage } from './pages/users/UsersPage';
import { DepartmentsPage } from './pages/departments/DepartmentsPage';
import { EquipmentsPage } from './pages/equipments/EquipmentsPage';
import { EquipmentDetailPage } from './pages/equipments/EquipmentDetailPage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { InventoriesPage } from './pages/inventories/InventoriesPage';
import { AuditPage } from './pages/audit/AuditPage';
import { SettingsPage } from './pages/settings/SettingsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/equipments" element={<EquipmentsPage />} />
        <Route path="/equipments/:id" element={<EquipmentDetailPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/inventories" element={<InventoriesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}

export default App;

