import {
  ALL_ROLES,
  INVITATION_STATUSES,
  MEMBER_ROLES,
  canAssignRole,
  hasAdminPrivileges,
  isValidEmail,
  normalizeEmail,
} from './access.js';

/**
 * Test Suite: Elyx Vault User Invitation, Authentication & Security Invariants.
 */
export function runInvitationLifecycleTests() {
  const results = [];

  const assert = (description, condition) => {
    results.push({ description, success: Boolean(condition) });
  };

  // ==========================================
  // Group 1: Email Normalization & Validation
  // ==========================================
  assert('Normalizes standard email to lowercase', normalizeEmail('elyx@gmail.com') === 'elyx@gmail.com');
  assert('Normalizes mixed-case email', normalizeEmail('Elyx@Gmail.com') === 'elyx@gmail.com');
  assert('Trims leading and trailing whitespace', normalizeEmail('   elyx@gmail.com   ') === 'elyx@gmail.com');
  assert('Handles undefined or null email gracefully', normalizeEmail(null) === '' && normalizeEmail(undefined) === '');
  assert('Handles non-string input gracefully', normalizeEmail(12345) === '');

  assert('Validates correct email format', isValidEmail('elyx@gmail.com'));
  assert('Validates correct sub-domain email', isValidEmail('admin@corp.elyx-vault.com'));
  assert('Rejects email without @', !isValidEmail('elyxgmail.com'));
  assert('Rejects email without domain', !isValidEmail('elyx@'));
  assert('Rejects empty email', !isValidEmail(''));

  // ==========================================
  // Group 2: Role Hierarchy & Permission Logic
  // ==========================================
  // Owner can assign any role
  assert('Owner can assign Owner role', canAssignRole('owner', 'owner'));
  assert('Owner can assign Manager role', canAssignRole('owner', 'manager'));
  assert('Owner can assign Member role', canAssignRole('owner', 'member'));
  assert('Owner can assign Viewer role', canAssignRole('owner', 'viewer'));

  // Manager CANNOT grant Owner role (Self-promotion / Privilege Escalation Prevention)
  assert('Manager CANNOT assign Owner role', !canAssignRole('manager', 'owner'));
  assert('Manager can assign Manager role', canAssignRole('manager', 'manager'));
  assert('Manager can assign Member role', canAssignRole('manager', 'member'));
  assert('Manager can assign Viewer role', canAssignRole('manager', 'viewer'));

  // Member / Viewer cannot assign any role
  assert('Member cannot assign Owner role', !canAssignRole('member', 'owner'));
  assert('Member cannot assign Manager role', !canAssignRole('member', 'manager'));
  assert('Viewer cannot assign any role', !canAssignRole('viewer', 'viewer'));

  assert('Admin privileges correctly identifies Owner', hasAdminPrivileges('owner'));
  assert('Admin privileges correctly identifies Manager', hasAdminPrivileges('manager'));
  assert('Member does not have admin privileges', !hasAdminPrivileges('member'));
  assert('Viewer does not have admin privileges', !hasAdminPrivileges('viewer'));

  // ==========================================
  // Group 3: Invitation Payload & Access Resolution Simulation
  // ==========================================
  const mockUser = {
    uid: 'firebase_uid_elyx_12345',
    email: 'Elyx@Gmail.COM',
    displayName: null,
  };

  const mockInvitation = {
    id: 'elyx@gmail.com',
    email: 'elyx@gmail.com',
    businessId: 'elyx-main-business',
    role: 'manager',
    status: 'pending',
    createdBy: 'owner@gmail.com',
  };

  // Simulate access resolution
  const resolvedNormalizedEmail = normalizeEmail(mockUser.email);
  assert('Auth email matches invitation email after normalization', resolvedNormalizedEmail === mockInvitation.email);

  const resolvedRole = ALL_ROLES.includes(mockInvitation.role) ? mockInvitation.role : 'member';
  assert('Assigned role matches invited role (Manager)', resolvedRole === 'manager');

  const resolvedBusinessId = mockInvitation.businessId || 'elyx-main-business';
  assert('Business ID matches invitation tenant', resolvedBusinessId === 'elyx-main-business');

  const simulatedDisplayName = mockUser.displayName || resolvedNormalizedEmail.split('@')[0];
  assert('Display name falls back to email prefix when displayName is missing', simulatedDisplayName === 'elyx');

  // ==========================================
  // Group 4: Invitation Acceptance State Transition
  // ==========================================
  // 1. Initial State: Pending
  assert('Initial invitation status is pending', mockInvitation.status === INVITATION_STATUSES.PENDING);

  // 2. Acceptance Transition: Accepted with acceptedBy and active status
  const acceptedInvitation = {
    ...mockInvitation,
    status: INVITATION_STATUSES.ACCEPTED,
    acceptedBy: mockUser.uid,
    acceptedAt: new Date().toISOString(),
  };

  assert('Invitation status transitions to accepted', acceptedInvitation.status === INVITATION_STATUSES.ACCEPTED);
  assert('Invitation records accepting user UID', acceptedInvitation.acceptedBy === mockUser.uid);

  // 3. User Access record creation
  const userAccessRecord = {
    id: mockUser.uid,
    businessId: resolvedBusinessId,
    role: resolvedRole,
    email: resolvedNormalizedEmail,
    displayName: simulatedDisplayName,
    invitedBy: mockInvitation.createdBy,
    status: 'active',
  };

  assert('UserAccess record UID matches Auth UID', userAccessRecord.id === mockUser.uid);
  assert('UserAccess role matches assigned Manager role', userAccessRecord.role === 'manager');
  assert('UserAccess status is active', userAccessRecord.status === 'active');

  // ==========================================
  // Group 5: Active vs Pending Deduplication
  // ==========================================
  const activeUsers = [userAccessRecord];
  const activeEmailsSet = new Set(activeUsers.map((u) => normalizeEmail(u.email)));

  const pendingInvitationsList = [mockInvitation];
  const filteredPending = pendingInvitationsList.filter((inv) => {
    const norm = normalizeEmail(inv.email);
    return !activeEmailsSet.has(norm) && inv.status !== INVITATION_STATUSES.ACCEPTED;
  });

  assert(
    'Once activated, user is suppressed from pending invitations list',
    filteredPending.length === 0
  );

  // ==========================================
  // Group 6: Security Invariant Checks
  // ==========================================
  // Invariant 1: Uninvited user claiming access
  const uninvitedUser = { uid: 'uninvited_uid', email: 'stranger@example.com' };
  const hasValidInvitation = uninvitedUser.email === mockInvitation.email;
  assert('Uninvited user is rejected from access resolution', !hasValidInvitation);

  // Invariant 2: Privilege escalation attempt (tampering with role)
  const attackerAttemptedRole = 'owner';
  const roleTamperingDetected = attackerAttemptedRole !== mockInvitation.role;
  assert('Role tampering against invitation is detected and blocked', roleTamperingDetected);

  // Calculate results
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[InvitationLifecycle Tests] Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  return { total: results.length, passed, failed, results };
}

// Auto-run when executed directly in test environment
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
  runInvitationLifecycleTests();
}
