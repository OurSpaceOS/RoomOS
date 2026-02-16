
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import Login from './pages/Login';
import GroupSetup from './pages/GroupSetup';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Wallet from './pages/Wallet';
import SplashScreen from './components/SplashScreen';
import Layout from './components/Layout';
import useAuthStore from './store/auth';
import useSettingsStore from './store/settingsStore';

// Simple placeholder for other pages
const Placeholder = ({ title }) => (
    <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>{title}</Typography>
        <Typography color="text.secondary">Coming soon in the next update...</Typography>
    </Box>
);

// Auth & Group Guard
const ProtectedRoute = ({ children, requireGroup = true }) => {
    const { token, user } = useAuthStore();
    
    if (!token) return <Navigate to="/login" replace />;
    
    if (requireGroup && !user?.group_id) {
        return <Navigate to="/setup" replace />;
    }
    
    if (!requireGroup && user?.group_id) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('hasSeenSplash');
  });
  const { token } = useAuthStore();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
      if (token) {
          fetchSettings();
      }
  }, [token, fetchSettings]);

  if (showSplash) {
      return (
        <SplashScreen 
            onComplete={() => {
                sessionStorage.setItem('hasSeenSplash', 'true');
                setShowSplash(false);
            }} 
        />
      );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      
      <Route 
        path="/setup" 
        element={
            <ProtectedRoute requireGroup={false}>
                <GroupSetup />
            </ProtectedRoute>
        } 
      />

      {/* Authenticated Routes wrapped in Layout */}
      <Route 
        path="/*" 
        element={
            <ProtectedRoute>
                <Layout>
                    <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/roster" element={<Placeholder title="Roster" />} />
                        <Route path="/crew" element={<Placeholder title="Crew" />} />
                        <Route path="/transactions" element={<Wallet />} />
                        <Route path="/profile" element={<Placeholder title="Profile" />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </Layout>
            </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
