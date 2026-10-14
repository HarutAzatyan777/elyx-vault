// Keep this exact-origin list aligned with the Elyx deployment. No wildcard origins.
globalThis.ELYX_SECURITY = {
  trustedOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'https://elyx-vault.web.app',
    'https://elyx-vault.firebaseapp.com',
  ],
  trusted(url) {
    try {
      return this.trustedOrigins.includes(new URL(url).origin);
    } catch {
      return false;
    }
  },
  loginUrl(url) {
    try {
      const u = new URL(url);
      return !u.username &&
        !u.password &&
        (u.protocol === 'https:' ||
          (u.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(u.hostname)))
        ? u.href
        : null;
    } catch {
      return null;
    }
  },
};
