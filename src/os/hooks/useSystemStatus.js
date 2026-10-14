import { getAgentStatus } from '../agentStatus.js';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { subscribeRTDBConnection } from '../../services/rtdbService.js';
import { subscribeToActiveSession } from '../../services/workspaceService.js';
export function useSystemStatus() {
  const [agentStatus, setAgentStatus] = useState(getAgentStatus);
  useEffect(() => {
    const sync = () => setAgentStatus(getAgentStatus());
    window.addEventListener('elyx:agent-status', sync);
    return () => window.removeEventListener('elyx:agent-status', sync);
  }, []);
  const { user, access } = useAuth();
  const [connection, setConnection] = useState('Checking');
  const [session, setSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('Checking');
  useEffect(
    () =>
      subscribeRTDBConnection((connected) =>
        setConnection(connected ? 'Connected' : 'Disconnected'),
      ),
    [],
  );
  useEffect(() => {
    setSession(null);
    setSessionStatus(user ? 'Checking' : 'Signed out');
    if (!user || access?.status !== 'active') return;
    return subscribeToActiveSession(
      user.uid,
      (value) => {
        setSession(value);
        setSessionStatus(value ? 'Active' : 'No active work session');
      },
      () => setSessionStatus('Unavailable'),
    );
  }, [user?.uid, access?.status]);
  return { user, access, connection, session, sessionStatus, agentStatus };
}
