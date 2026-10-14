import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  ALL_ROLES,
  MEMBER_ROLES,
  ROLE_LABELS,
  canAssignRole,
  isValidEmail,
  normalizeEmail,
} from '../utils/access';
import styles from './UserManagement.module.css';

export default function UserManagement() {
  const { user, access } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('manager');
  const [invitations, setInvitations] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Manual direct activation state
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [directEmail, setDirectEmail] = useState('');
  const [directUid, setDirectUid] = useState('');
  const [directRole, setDirectRole] = useState('manager');

  const isOwner = access?.status === 'active' && access?.role === 'owner';
  const canManage = access?.status === 'active' && (isOwner || access?.role === 'manager');

  // Load All Invitations & User Access Records
  useEffect(() => {
    if (!canManage) return undefined;

    const unsubInvites = onSnapshot(
      query(collection(db, 'invitations'), where('businessId', '==', access.businessId)),
      (snapshot) => {
        setInvitations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (error) => {
        console.error('[Firestore Error] Failed to load invitations:', error);
        setMessage({ error: true, text: 'Could not load invitations: ' + error.message });
      }
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'userAccess'), where('businessId', '==', access.businessId)),
      (snapshot) => {
        setActiveUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (error) => {
        console.error('[Firestore Error] Failed to load user access records:', error);
      }
    );

    return () => {
      unsubInvites();
      unsubUsers();
    };
  }, [canManage, access?.businessId]);

  const inviteUser = async (event) => {
    if (event) event.preventDefault();
    const targetEmail = normalizeEmail(email);
    setMessage(null);

    if (!isValidEmail(targetEmail)) {
      setMessage({ error: true, text: 'Please enter a valid email address.' });
      return;
    }

    if (!canAssignRole(access?.role, role)) {
      setMessage({ error: true, text: 'You do not have permission to assign this role level.' });
      return;
    }

    setSubmitting(true);
    try {
      const invitationRef = doc(db, 'invitations', targetEmail);
      await setDoc(
        invitationRef,
        {
          email: targetEmail,
          businessId: access?.businessId || 'elyx-main-business',
          role,
          status: 'pending',
          createdBy: user?.email || user?.uid || 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setEmail('');
      setMessage({
        error: false,
        text: `Invitation successfully saved for ${targetEmail} with role: ${role.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('[Invitation Error]', error);
      setMessage({ error: true, text: error.message || 'Could not save invitation.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Action to Setup DeveloperHar as Owner
  const setupDeveloperHarOwner = async () => {
    const devEmail = 'developerhar@gmail.com';
    try {
      const invitationRef = doc(db, 'invitations', devEmail);
      await setDoc(
        invitationRef,
        {
          email: devEmail,
          businessId: access?.businessId || 'elyx-main-business',
          role: 'owner',
          status: 'accepted',
          createdBy: user?.uid || 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMessage({
        error: false,
        text: `Owner access authorized for ${devEmail}.`,
      });
    } catch (err) {
      console.error('Error setting developerhar owner:', err);
      setMessage({ error: true, text: err.message || 'Failed to setup owner' });
    }
  };

  // Change Role of existing user or invitation
  const handleRoleChange = async (targetEmail, targetUserId, newRole, docId) => {
    if (!canAssignRole(access?.role, newRole)) {
      setMessage({ error: true, text: 'Only an Owner can grant or modify the Owner role.' });
      return;
    }

    const normalizedEmail = normalizeEmail(targetEmail);
    try {
      if (docId) {
        await updateDoc(doc(db, 'invitations', docId), {
          role: newRole,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
      if (normalizedEmail) {
        await updateDoc(doc(db, 'invitations', normalizedEmail), {
          role: newRole,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      if (targetUserId) {
        const userAccessRef = doc(db, 'userAccess', targetUserId);
        await updateDoc(userAccessRef, {
          role: newRole,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      setMessage({
        error: false,
        text: `Role for ${normalizedEmail || targetUserId} updated to ${newRole.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Error changing role:', error);
      setMessage({ error: true, text: 'Failed to update user role.' });
    }
  };

  // Approve Pending Invitation
  const handleApproveInvitation = async (invitation) => {
    const normalizedEmail = normalizeEmail(invitation.email || invitation.id);
    setMessage(null);
    try {
      const inviteDocRef = doc(db, 'invitations', invitation.id || normalizedEmail);
      await updateDoc(inviteDocRef, {
        status: 'approved',
        approvedBy: user?.email || user?.uid || 'admin',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also ensure normalized doc ID exists if different
      if (inviteDocRef.id !== normalizedEmail) {
        await setDoc(
          doc(db, 'invitations', normalizedEmail),
          {
            ...invitation,
            email: normalizedEmail,
            status: 'approved',
            approvedBy: user?.email || user?.uid || 'admin',
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      setMessage({
        error: false,
        text: `Invitation approved for ${normalizedEmail}. Role ${invitation.role?.toUpperCase()} is ready to activate upon sign in.`,
      });
    } catch (err) {
      console.error('Error approving invitation:', err);
      setMessage({ error: true, text: 'Could not approve invitation: ' + err.message });
    }
  };

  // Resend / Refresh Invitation
  const handleResendInvitation = async (invitation) => {
    const normalizedEmail = normalizeEmail(invitation.email || invitation.id);
    setMessage(null);
    try {
      const targetDocRef = doc(db, 'invitations', normalizedEmail);
      await setDoc(
        targetDocRef,
        {
          email: normalizedEmail,
          businessId: invitation.businessId || access?.businessId || 'elyx-main-business',
          role: invitation.role || 'member',
          status: 'pending',
          createdBy: user?.email || user?.uid || 'admin',
          createdAt: invitation.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage({
        error: false,
        text: `Invitation refreshed and resent for ${normalizedEmail}.`,
      });
    } catch (err) {
      console.error('Error resending invitation:', err);
      setMessage({ error: true, text: 'Could not refresh invitation: ' + err.message });
    }
  };

  // Delete user access or cancel invitation
  const handleDeleteUser = async (targetEmail, targetUserId, invitationDocId) => {
    const displayTarget = targetEmail || targetUserId;
    if (!window.confirm(`Are you sure you want to remove access for ${displayTarget}?`)) return;

    const normalizedEmail = normalizeEmail(targetEmail);
    try {
      if (invitationDocId) {
        await deleteDoc(doc(db, 'invitations', invitationDocId)).catch(() => {});
      }
      if (normalizedEmail) {
        await deleteDoc(doc(db, 'invitations', normalizedEmail)).catch(() => {});
      }
      if (targetUserId) {
        await deleteDoc(doc(db, 'userAccess', targetUserId)).catch(() => {});
      }
      setMessage({ error: false, text: `Removed access for ${displayTarget}.` });
    } catch (err) {
      console.error('Failed to delete user access:', err);
      setMessage({ error: true, text: 'Failed to remove user access.' });
    }
  };

  // Direct Manual Activation by UID
  const handleDirectActivate = async (e) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail(directEmail);
    const cleanUid = directUid.trim();

    if (!cleanEmail || !cleanUid) {
      setMessage({ error: true, text: 'Both Email and Firebase Auth UID are required.' });
      return;
    }

    if (!canAssignRole(access?.role, directRole)) {
      setMessage({ error: true, text: 'You do not have permission to assign this role.' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create or update userAccess doc
      await setDoc(
        doc(db, 'userAccess', cleanUid),
        {
          businessId: access?.businessId || 'elyx-main-business',
          role: directRole,
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0],
          invitedBy: user?.email || 'admin',
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Mark invitation accepted
      await setDoc(
        doc(db, 'invitations', cleanEmail),
        {
          email: cleanEmail,
          businessId: access?.businessId || 'elyx-main-business',
          role: directRole,
          status: 'accepted',
          acceptedBy: cleanUid,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage({
        error: false,
        text: `Successfully activated ${cleanEmail} (UID: ${cleanUid}) as ${directRole.toUpperCase()}.`,
      });
      setShowDirectModal(false);
      setDirectEmail('');
      setDirectUid('');
    } catch (err) {
      console.error('Direct activation error:', err);
      setMessage({ error: true, text: 'Direct activation failed: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Active users set for deduplication
  const activeUserEmails = new Set(
    activeUsers.map((u) => normalizeEmail(u.email)).filter(Boolean)
  );

  // Filter users by search
  const filteredUsers = activeUsers.filter(
    (u) =>
      !searchQuery ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter pending invitations: exclude users who are already active or accepted
  const filteredInvitations = invitations.filter((inv) => {
    const invEmail = normalizeEmail(inv.email || inv.id);
    if (!invEmail || activeUserEmails.has(invEmail) || inv.status === 'accepted') {
      return false;
    }
    return (
      !searchQuery ||
      invEmail.includes(searchQuery.toLowerCase()) ||
      inv.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className={styles.panel} aria-labelledby="user-management-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            {isOwner ? '👑 Owner & Super Admin Control' : '⚙️ Manager Tools'}
          </p>
          <h2 id="user-management-title">Users & Access Management</h2>
          <p>
            Manage team members, approve pending invitations, and assign <strong>Manager</strong> or <strong>Owner</strong> privileges.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={setupDeveloperHarOwner}
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.4) 100%)',
              border: '1px solid #8b5cf6',
              color: '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
            }}
          >
            👑 Grant DeveloperHar Owner Role
          </button>

          <button
            type="button"
            onClick={() => setShowDirectModal(!showDirectModal)}
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.35) 100%)',
              border: '1px solid #38bdf8',
              color: '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            ⚡ Direct UID Activation
          </button>

          <span className={styles.count}>
            {activeUsers.length + filteredInvitations.length} total user(s)
          </span>
        </div>
      </div>

      {/* Direct UID Activation Box */}
      {showDirectModal && (
        <form
          onSubmit={handleDirectActivate}
          style={{
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'grid', gap: '4px', fontSize: '0.82rem', color: '#cbd5e1' }}>
            User Email
            <input
              type="email"
              value={directEmail}
              onChange={(e) => setDirectEmail(e.target.value)}
              placeholder="elyx@gmail.com"
              required
              style={{
                padding: '8px 12px',
                background: '#020617',
                border: '1px solid #334155',
                color: '#ffffff',
                borderRadius: '6px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '4px', fontSize: '0.82rem', color: '#cbd5e1' }}>
            Firebase Auth UID
            <input
              type="text"
              value={directUid}
              onChange={(e) => setDirectUid(e.target.value)}
              placeholder="e.g. Firebase Auth User UID"
              required
              style={{
                padding: '8px 12px',
                background: '#020617',
                border: '1px solid #334155',
                color: '#ffffff',
                borderRadius: '6px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '4px', fontSize: '0.82rem', color: '#cbd5e1' }}>
            Role Level
            <select
              value={directRole}
              onChange={(e) => setDirectRole(e.target.value)}
              style={{
                padding: '8px 12px',
                background: '#020617',
                border: '1px solid #334155',
                color: '#ffffff',
                borderRadius: '6px',
              }}
            >
              <option value="manager">⭐ Manager</option>
              <option value="member">🛠️ Member</option>
              <option value="viewer">👁️ Viewer</option>
              {isOwner && <option value="owner">👑 Owner</option>}
            </select>
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '9px 16px',
              background: '#0284c7',
              color: '#ffffff',
              border: 0,
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {submitting ? 'Activating…' : '⚡ Activate User Now'}
          </button>
        </form>
      )}

      {/* Add User Form */}
      <form className={styles.form} onSubmit={inviteUser}>
        <label>
          Google Email Address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="e.g. elyx@gmail.com"
            required
          />
        </label>

        <label>
          Assigned Role Level
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="manager">⭐ Manager (Can manage users & vault)</option>
            <option value="member">🛠️ Member (Can edit projects & server)</option>
            <option value="viewer">👁️ Viewer (Read-only access)</option>
            {isOwner && <option value="owner">👑 Owner (Super Administrator)</option>}
          </select>
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : '+ Add / Update User Role'}
        </button>
      </form>

      {message && (
        <p className={message.error ? styles.error : styles.success} role="status">
          {message.text}
        </p>
      )}

      {/* Search Input */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Search users by email or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
      </div>

      {/* Active Users Section */}
      <div className={styles.userListSection} style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', color: '#ffffff' }}>
          Active System Users ({filteredUsers.length})
        </h3>

        {filteredUsers.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>No active users match search.</p>
        ) : (
          <div className={styles.list}>
            {filteredUsers.map((activeUser) => (
              <div className={styles.invitation} key={activeUser.id}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
                    {activeUser.email}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px' }}>
                    {activeUser.displayName || 'Authorized User'} • UID: {activeUser.id}
                  </span>
                </div>

                <div className={styles.actionControls}>
                  <select
                    value={activeUser.role || 'member'}
                    onChange={(e) =>
                      handleRoleChange(activeUser.email, activeUser.id, e.target.value, null)
                    }
                    disabled={activeUser.role === 'owner' && !isOwner}
                    style={{
                      background: '#1a1a2e',
                      color: '#a78bfa',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                    }}
                  >
                    <option value="owner" disabled={!isOwner}>👑 Owner</option>
                    <option value="manager">⭐ Manager</option>
                    <option value="member">🛠️ Member</option>
                    <option value="viewer">👁️ Viewer</option>
                  </select>

                  <span className={styles.accepted}>Active</span>

                  <button
                    type="button"
                    onClick={() => handleDeleteUser(activeUser.email, activeUser.id, null)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      padding: '5px 9px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                    title="Revoke access"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {filteredInvitations.length > 0 && (
        <div className={styles.userListSection} style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', color: '#ffffff' }}>
            Pending Invitations ({filteredInvitations.length})
          </h3>

          <div className={styles.list}>
            {filteredInvitations.map((invitation) => (
              <div className={styles.invitation} key={invitation.id}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
                    {invitation.email || invitation.id}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px' }}>
                    Invited by: {invitation.createdBy || 'manager'} • Status: {invitation.status || 'pending'}
                  </span>
                </div>

                <div className={styles.actionControls}>
                  <select
                    value={invitation.role || 'member'}
                    onChange={(e) =>
                      handleRoleChange(invitation.email, null, e.target.value, invitation.id)
                    }
                    style={{
                      background: '#1a1a2e',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="owner" disabled={!isOwner}>👑 Owner</option>
                    <option value="manager">⭐ Manager</option>
                    <option value="member">🛠️ Member</option>
                    <option value="viewer">👁️ Viewer</option>
                  </select>

                  <span className={invitation.status === 'approved' ? styles.approved : styles.pending}>
                    {invitation.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
                  </span>

                  <button
                    type="button"
                    className={styles.approveBtn}
                    onClick={() => handleApproveInvitation(invitation)}
                    title="Approve invitation for immediate activation"
                  >
                    ✓ Approve
                  </button>

                  <button
                    type="button"
                    className={styles.resendBtn}
                    onClick={() => handleResendInvitation(invitation)}
                    title="Refresh and resend invitation"
                  >
                    🔄 Resend
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteUser(invitation.email, null, invitation.id)
                    }
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      padding: '5px 9px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                    title="Cancel invitation"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
