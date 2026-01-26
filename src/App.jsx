// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import EditorPage from "./pages/EditorPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import SettingsPage from "./pages/SettingsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";

// Admin (localhost-only)
import AdminGuard from "./admin/AdminGuard";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";

export default function App() {
  return (
    <Routes>
      {/* Default */}
      <Route path="/" element={<Navigate to="/auth" replace />} />

      {/* Auth (login only) */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Dashboard (protected) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <DashboardPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Editor (protected) */}
      <Route
        path="/dashboard/editor"
        element={
          <ProtectedRoute>
            <AppShell>
              <EditorPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Settings (protected) */}
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Admin (localhost only) */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLogin />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />

      {/* Public profile: /@username (single @ in URL) */}
      <Route path="/:username" element={<PublicProfilePage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}
