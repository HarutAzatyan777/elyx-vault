export const notificationCategory = notification => ['system','security','media','workspace','devices'].includes(notification.category) ? notification.category : notification.type === 'security' ? 'security' : 'system';
export function enqueueNotification(current, notification, settings, now = Date.now()) {
  const category = notificationCategory(notification);
  if (!settings.notificationsEnabled || settings.disabledNotificationCategories.includes(category)) return current;
  const item = { ...notification, id: notification.id || `notif_${now}_${Math.random().toString(36).slice(2)}`, category, timestamp: now, read: false, title: notification.title || 'System notification', message: notification.message || '' };
  return [item, ...current.filter(n => n.id !== item.id)].slice(0, 100);
}
export const markNotificationsRead = (current, id) => current.map(n => id == null || n.id === id ? { ...n, read: true } : n);
