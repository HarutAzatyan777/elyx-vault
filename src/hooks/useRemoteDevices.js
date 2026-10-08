import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth.jsx';
import {
  registerDevice,
  revokeDevice,
  subscribeToDevices,
  subscribeToSecurityEvents,
  updateDevice,
} from '../services/deviceService.js';

export function useRemoteDevices() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [devices, setDevices] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const showToast = useCallback((msg, type = 'info') => {
    setNotification({ message: msg, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.type === type && curr?.message === msg ? null : curr));
    }, 6000);
  }, []);

  // Real-time devices and security audit events subscriptions
  useEffect(() => {
    if (!uid) {
      setDevices([]);
      setSecurityEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubDevices = subscribeToDevices(
      uid,
      (data) => {
        setDevices(data);
        if (data.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(data[0].id);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error loading remote devices:', err);
        setError('Failed to load registered devices');
        setLoading(false);
      }
    );

    const unsubEvents = subscribeToSecurityEvents(
      uid,
      (data) => setSecurityEvents(data),
      (err) => console.error('Error loading security events:', err)
    );

    return () => {
      unsubDevices();
      unsubEvents();
    };
  }, [uid]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;

  const handleRegisterDevice = async (deviceData) => {
    if (!uid) return;
    try {
      const newId = await registerDevice(uid, deviceData);
      setSelectedDeviceId(newId);
      showToast(`Device "${deviceData.name || 'New Device'}" enrolled successfully!`, 'success');
    } catch (err) {
      console.error('Error registering device:', err);
      showToast('Failed to register device', 'error');
    }
  };

  const handleRenameDevice = async (deviceId, newName) => {
    if (!uid || !deviceId) return;
    try {
      await updateDevice(uid, deviceId, { name: newName });
      showToast(`Device renamed to "${newName}"`, 'success');
    } catch (err) {
      console.error('Error renaming device:', err);
      showToast('Failed to rename device', 'error');
    }
  };

  const handleRevokeDevice = async (deviceId, deviceName) => {
    if (!uid || !deviceId) return;
    try {
      await revokeDevice(uid, deviceId, deviceName);
      if (selectedDeviceId === deviceId) {
        const remaining = devices.filter((d) => d.id !== deviceId);
        setSelectedDeviceId(remaining[0]?.id || null);
      }
      showToast(`Access revoked for "${deviceName || 'Device'}"`, 'info');
    } catch (err) {
      console.error('Error revoking device:', err);
      showToast('Failed to revoke device access', 'error');
    }
  };

  return {
    devices,
    securityEvents,
    selectedDevice,
    selectedDeviceId,
    setSelectedDeviceId,
    loading,
    error,
    notification,
    showToast,
    handleRegisterDevice,
    handleRenameDevice,
    handleRevokeDevice,
  };
}
