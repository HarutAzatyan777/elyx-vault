import { useCallback } from 'react';
import { useOS } from './useOS.js';
import { NOTIFICATION_TYPES } from '../notifications/types.js';

/**
 * Hook providing ergonomic helper methods to trigger OS toasts and notifications.
 */
export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, clearAllNotifications, markNotificationRead } = useOS();

  const notifyInfo = useCallback(
    (title, message, options = {}) =>
      addNotification({
        type: NOTIFICATION_TYPES.INFO,
        title,
        message,
        ...options,
      }),
    [addNotification]
  );

  const notifySuccess = useCallback(
    (title, message, options = {}) =>
      addNotification({
        type: NOTIFICATION_TYPES.SUCCESS,
        title,
        message,
        ...options,
      }),
    [addNotification]
  );

  const notifyWarning = useCallback(
    (title, message, options = {}) =>
      addNotification({
        type: NOTIFICATION_TYPES.WARNING,
        title,
        message,
        ...options,
      }),
    [addNotification]
  );

  const notifyError = useCallback(
    (title, message, options = {}) =>
      addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        title,
        message,
        ...options,
      }),
    [addNotification]
  );

  const notifySecurity = useCallback(
    (title, message, options = {}) =>
      addNotification({
        type: NOTIFICATION_TYPES.SECURITY,
        title,
        message,
        priority: 'high',
        ...options,
      }),
    [addNotification]
  );

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markRead: markNotificationRead,
    notify: addNotification,
    notifyInfo,
    notifySuccess,
    notifyWarning,
    notifyError,
    notifySecurity,
    dismiss: removeNotification,
    clearAll: clearAllNotifications,
  };
};
