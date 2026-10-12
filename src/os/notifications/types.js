/**
 * Elyx OS 1.0 — Notifications Subsystem Contracts & Types
 */

export const NOTIFICATION_TYPES = Object.freeze({
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SECURITY: 'security',
});

export const NOTIFICATION_PRIORITIES = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
});

export const DEFAULT_NOTIFICATIONS_CONFIG = Object.freeze({
  maxActiveToasts: 4,
  autoDismissMs: 5000,
  enableSounds: false,
  dndEnabled: false, // Do Not Disturb
});
