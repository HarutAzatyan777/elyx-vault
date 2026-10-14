// Read-only. Uses trusted Application Default Credentials; never writes records.
// node scripts/audit-owner-access.cjs <projectId> <Auth UID>
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const agentRequire = createRequire(resolve(__dirname, '../agent/package.json'));
const { initializeApp, applicationDefault } = agentRequire('firebase-admin/app');
const { getAuth } = agentRequire('firebase-admin/auth');
const { getFirestore } = agentRequire('firebase-admin/firestore');
const [projectId, uid, ...extra] = process.argv.slice(2);
if (!projectId || !uid || uid.includes('/') || extra.length) {
  console.error('Usage: node scripts/audit-owner-access.cjs <projectId> <Auth UID>');
  process.exit(1);
}
async function main() {
  const app = initializeApp({ projectId, credential: applicationDefault() });
  const authUser = await getAuth(app).getUser(uid);
  const db = getFirestore(app);
  const profile = await db.doc(`userAccess/${uid}`).get();
  const data = profile.data() || {};
  const businessId = typeof data.businessId === 'string' ? data.businessId : null;
  const business = businessId && !businessId.includes('/') && businessId.trim()
    ? await db.doc(`businesses/${businessId}`).get() : null;
  const claims = authUser.customClaims || {};
  // Avoid printing email, tokens, arbitrary claims or unrelated document contents.
  const authorizationClaims = {};
  for (const key of ['role', 'status', 'businessId', 'owner', 'admin'])
    if (Object.hasOwn(claims, key)) authorizationClaims[key] = claims[key];
  console.log(JSON.stringify({
    projectId, authUid: authUser.uid, disabled: authUser.disabled,
    emailVerified: authUser.emailVerified, profilePath: profile.ref.path,
    profileExists: profile.exists, role: data.role ?? null,
    status: data.status ?? null, businessId,
    businessExists: business?.exists ?? null,
    authorizationClaims,
    applicationOwnerPredicate: profile.exists && data.role === 'owner'
      && data.status === 'active' && Boolean(businessId?.trim()),
    actualLoginVerified: false,
  }, null, 2));
}
main().catch(() => {
  console.error('Read-only audit failed. Check trusted ADC credentials, IAM read permissions, project and UID. No records were changed.');
  process.exitCode = 1;
});
