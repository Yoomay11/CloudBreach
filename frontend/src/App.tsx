import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import IacScanner from './pages/IacScanner';
import Monitor from './pages/Monitor';
import AttackChain from './pages/AttackChain';
import Reports from './pages/Reports';
import Remediation from './pages/Remediation';
import CloudManagement from './pages/CloudManagement';
import UserProfile from './pages/UserProfile';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';



// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// 主布局组件
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
};

// 应用内容组件
const AppContent: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/iac-scanner"
              element={
                <ProtectedRoute>
                  <Layout>
                    <IacScanner />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/monitor"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Monitor />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attack-chain"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AttackChain />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/remediation"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Remediation />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cloud-management"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CloudManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
      </Router>
    </ThemeProvider>
  );
};

function App() {
  return (
    <LanguageProvider>
      <CustomThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </CustomThemeProvider>
    </LanguageProvider>
  );
}

export default App;