import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import Login from "./pages/Login";
import GroupSetup from "./pages/GroupSetup";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Wallet from "./pages/Wallet";
import UserPage from "./pages/Profile";
import PersonalDetails from "./pages/PersonalDetails";
import AutoDebits from "./pages/AutoDebits";
import MaidAttendance from "./pages/MaidAttendance";
import Crew from "./pages/Crew";
import Notifications from "./pages/Notifications";
import Chat from "./pages/Chat";
import Schedule from "./pages/Schedule";
import Analytics from "./pages/Analytics";
import SplashScreen from "./components/SplashScreen";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import UpdateChecker from "./components/UpdateChecker";
import useAuthStore from "./store/auth";
import useSettingsStore from "./store/settingsStore";
import { Toaster } from "sonner";

// Simple placeholder for other pages
const Placeholder = ({ title }) => (
  <Box sx={{ p: 4, textAlign: "center" }}>
    <Typography
      variant="h4"
      sx={{ fontWeight: 800, mb: 2, color: "error.main" }}
    >
      DEBUG: {title}
    </Typography>
    <Typography color="text.secondary">
      V3 BUILD: {title} data pending...
    </Typography>
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

// Public Only Route (Redirects to dashboard if already logged in)
const PublicOnlyRoute = ({ children }) => {
  const { token } = useAuthStore();
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("hasSeenSplash");
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
          sessionStorage.setItem("hasSeenSplash", "true");
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <>
      <Toaster
        richColors
        position="top-center"
        closeButton
        expand={false}
        toastOptions={{
          duration: 2000,
          dismissible: true,
          style: {
            background: "var(--paper-overlay)",
            backdropFilter: "blur(10px)",
          },
        }}
      />
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />

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
                <UpdateChecker />
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/crew" element={<Crew />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/transactions" element={<Wallet />} />
                  <Route path="/profile" element={<UserPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="/settings/personal-details"
                    element={<PersonalDetails />}
                  />
                  <Route
                    path="/settings/auto-debits"
                    element={<AutoDebits />}
                  />
                  <Route
                    path="/settings/maid-attendance"
                    element={<MaidAttendance />}
                  />
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
