/**
 * Access control and authorization utilities for Elyx Vault.
 */

export const normalizeEmail = (email = '') => {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

export const isValidEmail = (email = '') => {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized));
};

export const ALL_ROLES = ['owner', 'manager', 'member', 'viewer'];

export const MEMBER_ROLES = ['manager', 'member', 'viewer'];

export const ROLE_HIERARCHY = {
  owner: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

export const ROLE_LABELS = {
  owner: '👑 Owner',
  manager: '⭐ Manager',
  member: '🛠️ Member',
  viewer: '👁️ Viewer',
};

export const INVITATION_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  APPROVED: 'approved',
  REVOKED: 'revoked',
};

/**
 * Checks if a user with callerRole can assign or modify targetRole.
 * - Only Owners can assign or revoke the Owner role.
 * - Managers can assign or revoke Manager, Member, or Viewer roles.
 */
export const canAssignRole = (callerRole, targetRole) => {
  if (callerRole === 'owner') return ALL_ROLES.includes(targetRole);
  if (callerRole === 'manager') return MEMBER_ROLES.includes(targetRole);
  return false;
};

/**
 * Checks whether a user has administrative privileges (Manager or Owner).
 */
export const hasAdminPrivileges = (role) => {
  return role === 'owner' || role === 'manager';
};
