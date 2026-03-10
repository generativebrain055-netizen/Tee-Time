import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UserManagement } from './pages/UserManagement';
import { UserDetail } from './pages/UserDetail';
import { ReportedIssues } from './pages/ReportedIssues';
import { Broadcast } from './pages/Broadcast';
import { SystemSettings } from './pages/SystemSettings';
import { CourseManagement } from './pages/CourseManagement';
import { AdSlots } from './pages/AdSlots';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="reports" element={<ReportedIssues />} />
          <Route path="courses" element={<CourseManagement />} />
          <Route path="broadcast" element={<Broadcast />} />
          <Route path="ad-slots" element={<AdSlots />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
