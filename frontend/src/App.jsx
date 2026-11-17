import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import getTheme from './theme/theme';
import { ThemeContextProvider, useThemeMode } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import ClientLayout from './components/layout/ClientLayout';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import ProjectList from './pages/projects/ProjectList';
import ProjectDetail from './pages/projects/ProjectDetail';
import Payments from './pages/finance/Payments';
import Expenses from './pages/finance/Expenses';
import Documents from './pages/documents/Documents';
import DailyReports from './pages/reports/DailyReports';
import Labour from './pages/labour/Labour';
import Inventory from './pages/inventory/Inventory';
import Equipment from './pages/equipment/Equipment';
import UserManagement from './pages/users/UserManagement';
import AuditLogs from './pages/audit/AuditLogs';
import Reports from './pages/reports/Reports';
import Notifications from './pages/notifications/Notifications';
import ClientDashboard from './pages/client/ClientDashboard';

function AppContent() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme={mode}
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Client Portal Routes */}
              <Route element={<ProtectedRoute allowedRoles={['client']} />}>
                <Route element={<ClientLayout />}>
                  <Route path="/client/dashboard" element={<ClientDashboard />} />
                </Route>
              </Route>

              {/* Admin, Site Manager, Accountant Routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['admin', 'site_manager', 'accountant']} />
                }
              >
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<ProjectList />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/daily-reports" element={<DailyReports />} />
                  <Route path="/labour" element={<Labour />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/equipment" element={<Equipment />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                </Route>
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeContextProvider>
      <AppContent />
    </ThemeContextProvider>
  );
}

export default App;
