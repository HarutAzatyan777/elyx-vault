import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { MEMBER_ROLES, normalizeEmail } from '../utils/access';
import styles from './UserManagement.module.css';

export default function UserManagement() {
  const { user, access } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [invitations, setInvitations] = useState([]);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!access?.businessId || access.role !== 'manager') return undefined;
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('businessId', '==', access.businessId),
    );
    return onSnapshot(invitationsQuery, (snapshot) => {
      setInvitations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, (error) => {
      console.error('[Firestore Error] Failed to load invitations:', error);
      setMessage({ error: true, text: 'Could not load invitations.' });
    });
  }, [access]);

  const inviteUser = async (event) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    setMessage(null);
    if (!normalizedEmail || !MEMBER_ROLES.includes(role)) return;

    setSubmitting(true);
    try {
      const invitationRef = doc(db, 'invitations', normalizedEmail);
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(invitationRef);
        if (existing.exists()) {
          const current = existing.data();
          if (current.status === 'accepted') throw new Error('This user already accepted an invitation.');
          if (current.businessId !== access.businessId) throw new Error('This email is already invited to another business.');
        }
        transaction.set(invitationRef, {
          email: normalizedEmail,
          businessId: access.businessId,
          role,
          status: 'pending',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      });
      setEmail('');
      setMessage({ error: false, text: `Access is ready for ${normalizedEmail}.` });
    } catch (error) {
      console.error('[Invitation Error]', error);
      setMessage({ error: true, text: error.message || 'Could not save this invitation.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="user-management-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Manager tools</p>
          <h2 id="user-management-title">Add a user</h2>
          <p>Authorize their Google email. They can then sign in without creating a password.</p>
        </div>
        <span className={styles.count}>{invitations.length} invited</span>
      </div>

      <form className={styles.form} onSubmit={inviteUser}>
        <label>
          Google email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@gmail.com" required />
        </label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save invitation'}</button>
      </form>

      {message && <p className={message.error ? styles.error : styles.success} role="status">{message.text}</p>}

      {invitations.length > 0 && (
        <div className={styles.list}>
          {invitations.map((invitation) => (
            <div className={styles.invitation} key={invitation.id}>
              <span>{invitation.email}</span>
              <span>{invitation.role}</span>
              <span className={invitation.status === 'accepted' ? styles.accepted : styles.pending}>{invitation.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
