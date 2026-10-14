import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function authorizeFirebaseRequest(
  idToken,
  deviceRecordId,
  expectedDeviceId,
  authorizedUserIds = [],
  services = {
    getApps,
    initializeApp,
    applicationDefault,
    getAuth,
    getFirestore,
  },
) {
  if (
    !idToken ||
    typeof deviceRecordId !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(deviceRecordId)
  )
    throw new Error('Authentication and an enrolled device are required');
  const app =
    services.getApps()[0] ||
    services.initializeApp({
      credential: services.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  const claims = await services.getAuth(app).verifyIdToken(idToken, true);
  if (!authorizedUserIds.includes(claims.uid))
    throw new Error('This account is not paired with this agent');
  const db = services.getFirestore(app);
  const [access, device] = await Promise.all([
    db.doc(`userAccess/${claims.uid}`).get(),
    db.doc(`devices/${deviceRecordId}`).get(),
  ]);
  const permissions = access.exists ? access.data() : null;
  const enrollment = device.exists ? device.data() : null;
  if (
    permissions?.status !== 'active' ||
    !['owner', 'manager'].includes(permissions.role) ||
    typeof permissions.businessId !== 'string' ||
    !permissions.businessId
  )
    throw new Error('Terminal access denied');
  if (
    !enrollment ||
    enrollment.uid !== claims.uid ||
    enrollment.deviceId !== expectedDeviceId ||
    enrollment.enrollmentState !== 'approved'
  )
    throw new Error('Device enrollment denied');
  return { uid: claims.uid, deviceId: expectedDeviceId, deviceRecordId };
}
