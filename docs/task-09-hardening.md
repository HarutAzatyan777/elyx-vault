# Elyx OS 1.0 — Task 09 audit and hardening

This is a source audit plus local regression/emulator validation. No production Firebase rules were deployed, no user records were migrated/deleted, and no vault encryption keys were rotated. Existing owners remain owners; historical access records require operator review because the previous bootstrap could have granted unauthorized ownership.

## Security findings by severity

| Severity | Finding                                                                                                                           | Implemented correction                                                                                                                                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | Any email containing `developerhar` could become an owner in both client and Firestore rules.                                     | Removed all email-based grants. Only validated active access records authorize apps. Owners must be provisioned by a trusted administrator.                                                                                                                     |
| Critical | Storage was publicly readable and writable by unrelated authenticated users; RTDB root access allowed all authenticated accounts. | Owner UID isolation, active access checks for Storage, root deny rules, and per-UID private presence. Personal Firestore collections no longer expose private records to other business members/owners.                                                         |
| Critical | The Local Agent minted shell tokens from caller-supplied identity, with a predictable default signing secret.                     | Firebase Admin token verification with revocation checks, active owner/manager role, explicit paired UID, matching approved physical device ID, private default bind, exact origins, unpredictable signing secret, short sessions, and secure remote transport. |
| High     | Launcher filtering could be bypassed through restored windows, direct app opens, and classic deep links.                          | Authorization at launch and rendering, immutable registry protection flags, protected terminal/files, and live access revocation.                                                                                                                               |
| High     | Auto-login exposed plaintext in URL fragments and target-page sessionStorage; extension keys were restored from durable storage.  | Removed fragment fallback and durable key storage. Trusted origin checks, top-frame/origin-bound autofill, expiry checks, fresh authorization before copying, explicit HTTPS targets, and lock cleanup.                                                         |
| High     | “Encrypted” uploads still sent/cached the original binary; failed decryption could fall back to the original value.               | New encrypted binary saves cache only existing-format ciphertext and stay local. Unsafe cloud synchronization is blocked. No plaintext-cache or failed-decryption fallback. Existing uploads are not rewritten.                                                 |
| High     | Encryption failure could persist plaintext, encryption toggles could race typing, and note timers survived lock/unmount.          | Required encryption aborts on failure; sticky encryption mode through autosave; canceled timers; canonical cloud document IDs; pending local drafts survive snapshots.                                                                                          |
| Medium   | Presence cleanup removed unrelated connection listeners; app instances duplicated subscriptions.                                  | Exact unsubscribe handles and ref-counted subscriptions with cache removal when the last consumer leaves.                                                                                                                                                       |
| Medium   | Terminal resize listeners/sockets and pending authorization requests survived unmount.                                            | Dispose xterm, remove listeners, abort fetch, reject stale responses, and close sockets on role loss/unmount.                                                                                                                                                   |
| Medium   | Quick Notes persisted plaintext in a shared preference; layouts accepted malformed data and arbitrary props.                      | New scratchpad drafts stay in memory and disappear on lock. No automatic legacy scratchpad hydration. Layout recovery allows only valid app metadata/geometry, excludes titles/props/keys, and scopes layouts to accounts.                                      |

New device enrollment no longer fabricates online/last-seen status; availability is measured by an authorized terminal connection, while stored statuses are labeled as reported.

The agent directory validator also rejects symlink escapes and unauthorized initial directories instead of silently falling back to the process directory. Device/session mutation roles and immutable ownership are enforced by Firestore rules. Client security events remain user-owned telemetry, not tamper-proof server audit records.

## Encryption conclusions

`src/utils/crypto.js` retains its existing CryptoJS passphrase AES format. Inspection of CryptoJS `cipher-core.js` and `evpkdf.js` confirms salted OpenSSL-compatible serialization, AES-CBC with PKCS#7 padding, and the legacy EVP-style MD5 derivation with one iteration. Decryption now validates PKCS#7 padding and correctly supports empty content; ciphertext serialization is unchanged. Padding validation does not make it authenticated encryption. No PBKDF2 strength or zero-knowledge claim is made.

Credentials and explicitly encrypted note content use this format. Note titles/tags, project metadata, ordinary notes, ordinary media/music files, and workspace URLs can remain plaintext by design. Local caches now allowlist record fields so transient decrypted fields and master keys are not accidentally serialized. New encrypted binary files are local-only until a compatible secure cloud transport is implemented. Existing data remains available in storage; legacy encrypted records that depended on plaintext-cache/decryption fallback may require deliberate reimport to view safely.

Legacy Quick Notes data remains untouched in `elyx_desktop_quick_note`, but is not automatically displayed or imported into another account. Back it up and recover it deliberately if needed. No automatic scratchpad deletion/migration was performed.

Vault unlock enters a key into memory; it is not a second Firebase authentication factor. Successful decryption still requires the correct key. Lock replaces protected app content, closes terminals, cancels pending audio resolution, unloads audio/media handlers, clears queues and notifications, and discards the scratchpad. Browser offline events lock the vault; elapsed inactivity is rechecked after foreground return. JavaScript cannot guarantee physical memory erasure or retract clipboard contents, exported files, or credentials already delivered to a login page.

## Authentication and recovery

Firebase ID token changes reverify access. Foreground token verification can replace the authorized app tree and require unlocking again. Access snapshots detect role/status removal, and late responses cannot restore a previous user's authorization. Failed token/access verification fails closed. The agent explicitly passes the revocation-check flag to the Admin SDK; default token verification alone does not check revocation. [Firebase token verification documentation](https://firebase.google.com/docs/auth/admin/verify-id-tokens). Invitation claims require a verified email, pending/approved status, a valid assigned role/business, and an atomic acceptance transaction; there is no non-atomic fallback. Legacy invitations with auto-generated IDs require an administrator to reissue a normalized-email invitation; no invitation records were automatically migrated.

Open desktop/mobile app metadata is recovered per account with permission checks. Protected apps restore locked. Desktop geometry is bounded, invalid apps/coordinates are dropped, invalid workspaces fall back safely, and arbitrary app props/titles/keys are excluded. Existing nonsecret theme/dock/mobile preferences can be read as fallback without rewriting their original keys. Settings/workspace/dock storage remains local to the browser.

Per-app and shell error boundaries isolate failures, avoid displaying raw exception messages, and provide retry/reload/home recovery. Loading states wrap lazy app chunks. Offline/project-load failures are visible. Note save failures retain pending drafts and offer retry.

## Performance observations

Startup bundle measurements are recorded in `task-09-performance.json`. The Task 08 production output had approximately 1,852.94 kB of initial JavaScript (518.99 kB gzip across the entry, shared Auth, and JSX chunks). These are bundle sizes, not measured network latency or frame rate.

- Desktop/mobile/classic application paths and public component exports now use actual lazy chunks. The terminal engine no longer ships with every app.
- Music progress uses a separate context so playback time ticks do not rerender shell/library control consumers.
- Window app content is memoized independently from frame geometry; drag/resize writes coalesce to animation frames.
- Media/music DOM rendering is limited to 60 items per page, with deferred search. Integration tests exercise 10,000-record libraries.
- File imports target their own app surface, so background windows cannot consume a desktop drop.
- Shared ref-counted subscriptions eliminate duplicate notes/media/music/session/connection listeners. The session widget subscribes to session state instead of four unrelated workspace collections.
- IndexedDB connections and object URLs are released. Bulk imports write local metadata once and retain completed items if a later item fails.

Firebase remains the largest initial shared chunk. File parsing and encryption still run on the main thread and can pause the interface for large imports. Firestore queries still load whole libraries, and sorting/filtering operate on the full in-memory result. Server pagination and true list virtualization remain useful for larger libraries; this audit does not claim unlimited scale. Blur/compositing cost and FPS still need measurement on actual target devices.

## Validation and release work

Final results: **62 unit/integration tests, 9 emulator tests, and 4 settings tests passed**. The frontend and extension 1.4.1 build passed; lint completed without errors (warnings remain). Web and agent production dependency audits each reported **0 advisories**. The full development dependency audit reported 13 advisories (9 high, 4 moderate), primarily in tooling.

The native agent also started successfully: its health endpoint returned 200 and an anonymous token request returned 403. No real authenticated shell was launched. The measured initial static JavaScript graph is **1,105,382 bytes / 333,213 bytes gzip**, approximately **35.8% smaller gzip** than the Task 08 output.

- `npm test`: targeted security, React integration, IndexedDB, agent HTTP/WebSocket authorization, extension-origin, lock/cancellation, large library, and recovery regressions; wrappers execute the ten existing legacy assertion suites.
- `npm run test:settings`: the four existing Task 08 settings tests.
- `npm run test:rules`: Firestore, Storage, and RTDB rules against local emulators under the `demo-elyx-hardening` project. Requires Java 21+ on PATH. No production database is contacted by these tests.
- `npm run build`: repacks the hardened extension and builds the frontend.
- `npm run lint` and production/agent dependency audits.

Deployment and real authenticated browser/device smoke testing remain release steps. Extension 1.4.1 must be installed/reloaded; repacking does not update existing browser installations. Before deploying, review historical owner grants and existing active records, provision a legitimate first owner out of band if necessary, confirm business-scoped admin queries and normalized invitations, and configure the agent using `agent/README.md`. Test real sign-in/revocation, private downloads, custom origins, media imports, and desktop/mobile lock transitions.

## Remaining risks

1. **High:** legacy MD5-derived, unauthenticated AES-CBC ciphertext needs a separately approved, versioned cryptographic upgrade. It remains unchanged for compatibility.
2. **High:** prior unencrypted binary uploads and existing Firebase download-token URLs may still be reachable. Tightened rules alone do not revoke previously issued download tokens. Production remediation needs deliberate operator review, not an automatic migration.
3. **High until rollout:** production rules/agent installations retain old behavior until the reviewed code and rules are deployed. Historical owner access records may be compromised and have not been automatically changed.
4. **Medium:** an open agent session can survive server-side access revocation until its five-minute expiry if the client does not disconnect. The terminal is a full shell under the agent OS account, not a directory sandbox.
5. **Medium:** browser-origin compromise/XSS can access in-memory keys and intentionally plaintext local data. Security events created by a client cannot prove actions occurred.
6. Development tooling retains npm advisory findings; the production dependency audit is reported separately. No forced major-version dependency migration was used.
