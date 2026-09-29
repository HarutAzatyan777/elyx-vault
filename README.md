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

### 2. Bootstrap the first manager

Self-promotion is deliberately forbidden by `firestore.rules`. After the manager has signed in once (so a Firebase Auth UID exists), create these documents from a trusted environment:

```text
businesses/acme
  name: "Acme"

userAccess/FIREBASE_MANAGER_UID
  businessId: "acme"
  role: "manager"
  email: "manager@gmail.com"       # lowercase
  displayName: "Manager Name"
  createdAt: <Firestore timestamp>
```

Do not add a client feature that creates the initial manager record.

### 3. Migrate existing projects

Add the manager's `businessId` (for example, `"acme"`) to every existing `projects` document. Existing documents without `businessId` are intentionally inaccessible after the secure rules are deployed. New projects receive `businessId` and `createdBy` automatically.

### 4. Deploy rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

The current business-filtered queries use a single equality filter and need no custom composite index.

## Manager and user flows

### Manager

1. Sign in and unlock the vault.
2. In **Manager tools**, enter the user's Google email, select `Member` or `Viewer`, and save.
3. Re-entering the same email with different casing updates the pending invitation rather than creating a duplicate. Accepted or cross-business invitations cannot be overwritten.

### Invited user

1. Open the app and choose **Continue with Google**.
2. Select the exact Google account the manager invited.
3. The app validates the verified Firebase token email against Firestore and atomically connects the UID to the invitation's business.
4. An uninvited account remains outside the dashboard and receives a friendly access message.

Email/password users remain supported, but—like Google users—they must already have `userAccess` or claim an invitation with a Firebase-verified email before entering the dashboard.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

`npm run build` also rebuilds the packaged extension under `public/extension` and `public/extension.zip`.
