# Elyx OS 1.0 — Settings and system panels

System Settings is available in the desktop launcher, desktop control center, and mobile quick settings. The desktop settings overlay uses the same component as the windowed and mobile app.

All twelve categories are available. Appearance includes light/dark/system (with live system changes), independent desktop and mobile presentation preferences, accent, wallpaper, and reduced motion. macOS uses the floating dock, Windows uses the taskbar, and GNOME adds Activities for the workspace overview. iOS/Android styles apply in the mobile shell. These are Elyx presentation styles, not complete emulations of those operating systems.

Settings use a validated, allowlisted localStorage schema. Browser storage restrictions may prevent preferences from surviving reloads. Settings are local to the browser and are not synchronized to a Firebase account. Cross-tab settings changes are observed. No credentials are included in settings.

Notifications remain in memory until cleared, capped at 100. Device operations and RTDB connection changes feed the center. Categories, unread counts, individual/all read actions, clearing, disabled categories, and private previews are supported. Lock and account changes clear notifications. Browser push notifications are not requested or sent.

The control panels use MusicContext volume, mute, previous/next, pause/play, and stop. These affect Elyx audio only. RTDB connection uses `.info/connected`; this does not prove Firestore or Storage availability. Workspace session status comes from the authenticated user's existing Firestore subscription. Local Agent status comes from open terminal WebSockets, rather than enrollment metadata. No active connection means availability is unknown, not that the agent is offline. Existing agent authentication/protocol security is outside this change.

The master password now stays only in Dashboard memory. Legacy saved master passwords are removed when Dashboard mounts. Reload requires unlocking again. Lock unmounts protected window content, stops/unloads audio, clears the audio queue and notifications, and invalidates pending audio resolution. Inactivity locks after the selected timeout. Browser background timer throttling may delay inactivity locks. JavaScript cannot guarantee physical memory erasure; this is not an encryption algorithm audit.

Panels support Escape, initial focus, Tab wrapping, and focus restoration. Settings use native labeled controls and responsive category navigation. App and operating system reduced-motion preferences suppress transitions and animations.

## Validation

- `npm run test:settings`: persistence round trip, corrupt/invalid values, excluded secrets, notification categories/unread transitions/deduplication, and concurrent terminal status.
- `npm run lint`: repository lint; existing warnings remain.
- `npx vite build`: frontend production build; existing bundle size/static versus dynamic import warnings remain.

Authenticated browser interaction was not exercised in this environment. Before release, verify:

1. Change every appearance option, reload, and change system light/dark preference while System is selected.
2. In desktop and mobile, open/close control panels with keyboard; verify focus restoration and narrow-screen scrolling.
3. Trigger a device operation; mark the resulting notification read, clear it, and repeat with its category disabled.
4. Play audio, adjust volume, then lock while audio is resolving. Confirm no playback resumes and protected windows show unlock forms.
5. Reload after unlocking and confirm the vault is locked and no master password remains in browser storage.
6. Disconnect/reconnect RTDB, open/end a work session, and connect/disconnect concurrent terminals; inspect the corresponding statuses.

No system Wi-Fi, Bluetooth, hardware volume, device configuration, remote agent health probes, cloud storage quota, or OS-wide notification controls are simulated. Storage estimates describe this browser origin and depend on API availability. Autoplay policies and agent network/mixed-content restrictions remain subject to the browser.
