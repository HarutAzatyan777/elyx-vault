# Elyx Vault

Elyx Vault is a React/Firebase encrypted credential vault with a companion Chrome extension. Firebase Authentication establishes identity; Firestore `userAccess` records establish authorization and tenant membership.

## Authentication and tenant model

- Firebase Authentication supports the existing email/password flow and **Continue with Google**.
- `businesses/{businessId}` represents a tenant. Business documents are provisioned only by a trusted operator/Admin SDK.
- `userAccess/{firebaseUid}` is the authoritative association between one Firebase user, one business, and one role (`manager`, `member`, or `viewer`). These records cannot be updated or deleted by browser clients.
- `invitations/{normalizedEmail}` contains a manager-approved `businessId` and role. Lowercase email document IDs make invitations case-insensitive and prevent duplicates.
- A verified Firebase identity may atomically claim only an invitation matching its authenticated email. The transaction creates `userAccess/{uid}` and marks the invitation accepted.
- Every project contains `businessId`. Firestore Rules, the web query, and the extension query all enforce that boundary. `viewer` can read; `member` and `manager` can write; only `manager` can invite users.

Manager invitations intentionally cannot grant the `manager` role. Manager promotion is a privileged operation that must be performed with the Firebase Admin SDK or Console by a trusted operator.

## One-time Firebase setup

### 1. Enable authentication providers

In **Firebase Console → Authentication → Sign-in method**:

1. Enable Google.
2. Keep Email/Password enabled if existing users need it.
3. Add every deployed application hostname to **Authorized domains**.

This app uses Firebase's popup flow; it does not require Google One Tap or a separate OAuth client secret in the browser. The `VITE_FIREBASE_*` web configuration values are identifiers, not server secrets, and should be supplied through the deployment environment.

### 2. Bootstrap the first manager (Step-by-Step)

Self-promotion is deliberately forbidden by `firestore.rules`. To safely establish the initial manager:

1. **Create/identify the business document**: In Firestore Console, create a document under the `businesses` collection, for example `businesses/elyx`:
   ```json
   {
     "name": "Elyx Vault"
   }
   ```
2. **Find the first manager UID in Firebase Authentication**: Sign in once with Google or Email/Password, or find the target user's existing UID in **Firebase Console → Authentication → Users**.
3. **Create the first userAccess document**: In Firestore Console, create a document under `userAccess` using the manager's exact Firebase Auth UID as the document ID (`userAccess/{MANAGER_FIREBASE_UID}`):
   ```json
   {
     "businessId": "elyx",
     "role": "manager",
     "email": "manager@example.com",
     "displayName": "Manager Name"
   }
   ```
4. **Login using Continue with Google**: Sign in with the manager Google account. `useAuth` detects the existing `userAccess/{uid}` record and grants full manager privileges.
5. **Invite users via UserManagement UI**: From then on, the manager can invite additional users directly from the dashboard **Manager tools** UI without manual Firestore intervention.

### 3. Migrate existing projects and minecraft_vault documents

Add the manager's `businessId` (for example, `"elyx"`) and `createdBy` to every existing `projects` and `minecraft_vault` document in Firestore. Existing documents without `businessId` are intentionally inaccessible after the secure rules are deployed. New project and Minecraft records receive `businessId` and `createdBy` automatically from the active user's authorization state.

### 4. Deploy rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

The current business-filtered queries use a single equality filter and need no custom composite index.

## Manager and user flows

### Manager / Owner

1. Sign in and unlock the vault.
2. In **Users & Access Management**, enter the user's email, select the assigned role level (`Manager`, `Member`, `Viewer`, or `Owner` if Super Admin), and click **Add / Update User Role**.
3. The invitation is saved under `invitations/{normalizedEmail}` with status `pending`.
4. In **Pending Invitations**, managers can:
   - **Approve**: Mark invitation approved and pre-authorized for immediate sign-in.
   - **Resend**: Re-normalize and touch invitation records if the user needs a fresh invite.
   - **Change Role**: Adjust the assigned role before or after sign in (only Owners may grant Owner).
   - **Direct UID Activation**: Instantly link an existing Firebase Auth user by email and UID into `userAccess`.
   - **Cancel / Revoke (`✕`)**: Remove the invitation before acceptance.

### Invited user

1. Open the app and sign in with Google or Email/Password using the invited email.
2. The app normalizes the authenticated email and matches it against `invitations/{normalizedEmail}`.
3. Upon matching:
   - Atomically provisions `userAccess/{uid}` with the manager-assigned role (`manager`, `member`, `viewer`, or `owner`) and tenant `businessId`.
   - Updates the invitation status to `accepted` with `acceptedBy: uid` and timestamp.
   - Immediately redirects the user to the active dashboard.
4. If an authenticated user has pending access or was approved while on the sign-in screen, clicking **🔄 Re-check Invitation & Activate Access** immediately validates and activates their account without requiring re-authentication.
5. An uninvited user remains outside the dashboard and receives an informative invitation prompt.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

`npm run build` also rebuilds the packaged extension under `public/extension` and `public/extension.zip`.
