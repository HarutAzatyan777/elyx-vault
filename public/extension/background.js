importScripts('securityPolicy.js');
const policy = globalThis.ELYX_SECURITY;
let credentialEpoch = 0;
const storage = chrome.storage.session; // Never persist decrypted credentials in local storage.
const popupSender = (sender) =>
  sender.id === chrome.runtime.id &&
  sender.url?.startsWith(chrome.runtime.getURL('popup.html'));
const trustedSender = (sender) =>
  popupSender(sender) || (sender.frameId === 0 && policy.trusted(sender.url));
async function launch(request, sender, reply) {
  if (!trustedSender(sender) || !storage) {
    reply({
      status: 'error',
      message: 'Trusted Elyx origin and session storage required.',
    });
    return;
  }
  const url = policy.loginUrl(request.url);
  if (!url || !request.credentials?.password) {
    reply({
      status: 'error',
      message: 'Secure target URL and credentials required.',
    });
    return;
  }
  const epoch = credentialEpoch;
  try {
    const tab = await chrome.tabs.create({ url, active: true });
    if (epoch !== credentialEpoch) {
      reply({ status: 'error', message: 'Vault locked.' });
      return;
    }
    const record = {
      origin: new URL(url).origin,
      expiresAt: Date.now() + 60000,
      credentials: {
        email: request.credentials.email || request.credentials.username || '',
        password: request.credentials.password,
      },
    };
    await storage.set({ [`pending_autofill_${tab.id}`]: record });
    if (epoch !== credentialEpoch) {
      await storage.remove(`pending_autofill_${tab.id}`);
      reply({ status: 'error', message: 'Vault locked.' });
      return;
    }
    reply({ status: 'success', tabId: tab.id });
  } catch {
    reply({ status: 'error', message: 'Auto-login could not start.' });
  }
}
async function pending(tabId, url) {
  if (!storage || !tabId) return null;
  const key = `pending_autofill_${tabId}`;
  const epoch = credentialEpoch;
  const record = (await storage.get(key))[key];
  if (epoch !== credentialEpoch) return null;
  if (!record) return null;
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return null;
  }
  if (record.expiresAt <= Date.now() || record.origin !== origin) {
    await storage.remove(key);
    return null;
  }
  return record.credentials;
}
chrome.runtime.onMessage.addListener((request, sender, reply) => {
  if (
    ['AUTO_LOGIN', 'OPEN_AND_AUTOFILL', 'LAUNCH_AND_FILL'].includes(
      request.action,
    )
  ) {
    void launch(request.payload || request, sender, reply);
    return true;
  }
  if (request.action === 'GET_PENDING_CREDENTIALS') {
    if (sender.frameId !== 0) {
      reply({ credentials: null });
      return false;
    }
    pending(sender.tab?.id, sender.url)
      .then((credentials) => reply({ credentials }))
      .catch(() => reply({ credentials: null }));
    return true;
  }
  if (
    request.action === 'CLEAR_PENDING_CREDENTIALS' &&
    trustedSender(sender) &&
    storage
  ) {
    credentialEpoch += 1;
    storage
      .get(null)
      .then((records) =>
        storage.remove(
          Object.keys(records).filter((key) =>
            key.startsWith('pending_autofill_'),
          ),
        ),
      );
    chrome.tabs.query({}).then((tabs) => {
      for (const tab of tabs)
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'ELYX_VAULT_LOCKED' },
          { frameId: 0 },
          () => {
            void chrome.runtime.lastError;
          },
        );
    });
    reply({ status: 'success' });
    return false;
  }
});
chrome.runtime.onMessageExternal.addListener((request, sender, reply) => {
  // External sender has no frameId; validate the exact web origin separately.
  if (!policy.trusted(sender.url)) {
    reply({ status: 'error', message: 'Origin denied.' });
    return false;
  }
  if (
    ['AUTO_LOGIN', 'OPEN_AND_AUTOFILL', 'LAUNCH_AND_FILL'].includes(
      request.action,
    )
  ) {
    void launch(request.payload || request, { ...sender, frameId: 0 }, reply);
    return true;
  }
});
chrome.tabs.onUpdated.addListener(async (id, change, tab) => {
  if (!['loading', 'complete'].includes(change.status)) return;
  const credentials = await pending(id, tab.url);
  if (credentials)
    chrome.tabs.sendMessage(
      id,
      { action: 'AUTOFILL', credentials },
      { frameId: 0 },
      () => {
        void chrome.runtime.lastError;
      },
    );
});
chrome.tabs.onRemoved.addListener((id) => {
  if (storage) void storage.remove(`pending_autofill_${id}`);
});
