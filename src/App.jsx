import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

/**
 * Main Application component.
 * Uses Firebase's onAuthStateChanged hook to monitor global user session state
 * and manages route protection between <Login /> and <Dashboard />.
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firebase Auth state updates
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#020617',
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'appSpin 0.8s linear infinite'
        }} />
        <style>{`@keyframes appSpin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
          Verifying security session...
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
