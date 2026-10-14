import React, { lazy, Suspense } from 'react';
import { isActiveAccess } from './utils/access.js';
import AppErrorBoundary from './os/windows/AppErrorBoundary.jsx';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { ThemeProvider } from './context/ThemeContext';
const MusicProvider = lazy(() =>
  import('./context/MusicContext').then((module) => ({
    default: module.MusicProvider,
  })),
);
import { OSProvider } from './os/contexts/OSContext.jsx';
import { WindowManagerProvider } from './os/contexts/WindowManagerContext.jsx';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="app-spinner" />
      <p>Verifying your secure access…</p>
    </div>
  );
}

function AppRoutes() {
  const { user, access, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const authorized = Boolean(user && isActiveAccess(access));

  return (
    <Routes>
      <Route
        path="/login"
        element={authorized ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/dashboard"
        element={
          authorized ? (
            <Workspace user={user} access={access} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/os"
        element={
          authorized ? (
            <Workspace user={user} access={access} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="*"
        element={<Navigate to={authorized ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}

function Workspace({ user, access }) {
  return (
    <OSProvider key={`${user.uid}:${access.businessId}`}>
      <WindowManagerProvider>
        <MusicProvider>
          <AppErrorBoundary appTitle="Elyx OS">
            <Dashboard />
          </AppErrorBoundary>
        </MusicProvider>
      </WindowManagerProvider>
    </OSProvider>
  );
}
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppErrorBoundary appTitle="Elyx OS">
          <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </AppErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
