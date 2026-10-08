import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

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

  const authorized = Boolean(user && access);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authorized
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />

      <Route
        path="/dashboard"
        element={
          authorized
            ? <Dashboard />
            : <Navigate to="/login" replace />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={authorized ? '/dashboard' : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}