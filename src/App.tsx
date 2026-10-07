import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { CustomThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { MonthFilterProvider } from './context/MonthFilterContext';
import { CompanyProvider } from './context/CompanyContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './pages/BillingPage';
import { PurchasePage } from './pages/PurchasePage';
import { WorkersPage } from './pages/WorkersPage';
import { PartiesPage } from './pages/PartiesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { MonthWiseReportPage } from './pages/MonthWiseReportPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppUsersPage } from './pages/AppUsersPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { Login } from './pages/Login';

const DRAWER_WIDTH = 260;

const AppLayout: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAuthenticated && !user) {
    return <Login />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Header
        drawerWidth={DRAWER_WIDTH}
        onToggleMobileDrawer={() => setMobileOpen(!mobileOpen)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 3.5 },
          py: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'background.default' : '#f4f6fa',
          boxSizing: 'border-box',
        }}
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/purchases" element={<PurchasePage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/parties" element={<PartiesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/monthly-summary" element={<MonthWiseReportPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/app-users" element={<AppUsersPage />} />
          <Route path="/api-docs" element={<ApiDocsPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default function App() {
  return (
    <CustomThemeProvider>
      <NotificationProvider>
        <CompanyProvider>
          <MonthFilterProvider>
            <AuthProvider>
              <BrowserRouter>
                <AppLayout />
              </BrowserRouter>
            </AuthProvider>
          </MonthFilterProvider>
        </CompanyProvider>
      </NotificationProvider>
    </CustomThemeProvider>
  );
}
