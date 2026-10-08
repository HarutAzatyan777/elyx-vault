import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { ALL_ROLES, normalizeEmail } from '../utils/access';
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

  const isOwner =
    access?.role === 'owner' ||
    Boolean(user?.email && user.email.toLowerCase().includes('developerhar'));
  const canManage = isOwner || access?.role === 'manager';

  // Load All Invitations & User Access Records
  useEffect(() => {
    if (!canManage) return undefined;

    const unsubInvites = onSnapshot(
      collection(db, 'invitations'),
      (snapshot) => {
        setInvitations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (error) => {
        console.error('[Firestore Error] Failed to load invitations:', error);
        setMessage({ error: true, text: 'Could not load invitations: ' + error.message });
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'userAccess'),
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
  }, [canManage]);

  const inviteUser = async (event) => {
    if (event) event.preventDefault();
    const targetEmail = normalizeEmail(email);
    setMessage(null);
    if (!targetEmail || !ALL_ROLES.includes(role)) return;

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
          createdBy: user?.uid || 'admin',
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setEmail('');
      setMessage({
        error: false,
        text: `Invitation saved for ${targetEmail} with role: ${role.toUpperCase()}.`,
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
  const handleRoleChange = async (targetEmail, targetUserId, newRole) => {
    try {
      const invitationRef = doc(db, 'invitations', targetEmail);
      await updateDoc(invitationRef, { role: newRole }).catch(() => {});

      if (targetUserId) {
        const userAccessRef = doc(db, 'userAccess', targetUserId);
        await updateDoc(userAccessRef, { role: newRole }).catch(() => {});
      }

      setMessage({
        error: false,
        text: `Role for ${targetEmail} updated to ${newRole.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Error changing role:', error);
      setMessage({ error: true, text: 'Failed to update user role.' });
    }
  };

  // Delete user invitation
  const handleDeleteUser = async (targetEmail, targetUserId) => {
    if (!window.confirm(`Are you sure you want to remove access for ${targetEmail}?`)) return;

    try {
      await deleteDoc(doc(db, 'invitations', targetEmail)).catch(() => {});
      if (targetUserId) {
        await deleteDoc(doc(db, 'userAccess', targetUserId)).catch(() => {});
      }
      setMessage({ error: false, text: `Removed access for ${targetEmail}.` });
    } catch (err) {
      console.error('Failed to delete user access:', err);
      setMessage({ error: true, text: 'Failed to remove user access.' });
    }
  };

  // Filter users by search
  const filteredUsers = activeUsers.filter(
    (u) =>
      !searchQuery ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvitations = invitations.filter(
    (inv) =>
      inv.status !== 'accepted' &&
      (!searchQuery ||
        inv.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.role?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={styles.panel} aria-labelledby="user-management-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            {isOwner ? '👑 Owner & Super Admin Control' : '⚙️ Manager Tools'}
          </p>
          <h2 id="user-management-title">Users & Access Management</h2>
          <p>
            Manage team members, assign <strong>Manager</strong> or <strong>Owner</strong> privileges, and authorize Google email accounts.
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
          <span className={styles.count}>
            {activeUsers.length + filteredInvitations.length} total user(s)
          </span>
        </div>
      </div>

      {/* Add User Form */}
      <form className={styles.form} onSubmit={inviteUser}>
        <label>
          Google Email Address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="e.g. developerhar@gmail.com"
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
                    {activeUser.displayName || 'Authorized User'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    value={activeUser.role || 'member'}
                    onChange={(e) =>
                      handleRoleChange(activeUser.email, activeUser.id, e.target.value)
                    }
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
                    <option value="owner">👑 Owner</option>
                    <option value="manager">⭐ Manager</option>
                    <option value="member">🛠️ Member</option>
                    <option value="viewer">👁️ Viewer</option>
                  </select>

                  <span className={styles.accepted}>Active</span>

                  <button
                    type="button"
                    onClick={() => handleDeleteUser(activeUser.email, activeUser.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      padding: '4px 8px',
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
                <span>{invitation.email}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    value={invitation.role || 'member'}
                    onChange={(e) =>
                      handleRoleChange(invitation.email, null, e.target.value)
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
                    <option value="owner">👑 Owner</option>
                    <option value="manager">⭐ Manager</option>
                    <option value="member">🛠️ Member</option>
                    <option value="viewer">👁️ Viewer</option>
                  </select>

                  <span className={styles.pending}>Pending</span>

                  <button
                    type="button"
                    onClick={() => handleDeleteUser(invitation.email, null)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      padding: '4px 8px',
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
