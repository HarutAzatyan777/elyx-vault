/**
 * Elyx Vault Background Service Worker (Manifest V3)
 * Manages cross-context auto-login tab creation, session storage credential tracking,
 * and reliable message dispatch to content scripts upon tab navigation.
 */

// Helper to safely access session or local storage
const getStorage = () => chrome.storage.session || chrome.storage.local;

/**
 * Handles incoming auto-login requests from extension popup or external web apps.
 * Creates a tab and registers pending credentials for auto-filling on load.
 *
 * @param {{ url: string, credentials?: { email?: string, username?: string, password?: string }, email?: string, password?: string, incognito?: boolean }} request
 * @param {Function} sendResponse
 */
async function handleAutoLoginRequest(request, sendResponse) {
  const targetUrl = request.url || 'https://accounts.google.com/AddSession';
  const credentials = request.credentials || {
    email: request.email || request.username || '',
    password: request.password || ''
  };

  if (!targetUrl) {
    sendResponse({ status: 'error', message: 'Missing target URL' });
    return;
  }

  try {
    // Strictly open a standard new tab in the current active, normal window
    // (no incognito or isolated window types) so auth cookies save directly to main profile
    const tab = await chrome.tabs.create({ url: targetUrl, active: true });

    if (tab && tab.id) {
      const storageKey = `pending_autofill_${tab.id}`;
      
      // Store credentials associated with tab ID in extension storage
      await getStorage().set({ [storageKey]: credentials });

      sendResponse({ status: 'success', tabId: tab.id });
    } else {
      sendResponse({ status: 'error', message: 'Failed to create browser tab.' });
    }
  } catch (err) {
    console.error('[Background Error] Failed to handle auto-login request:', err);
    sendResponse({ status: 'error', message: err.message || 'Tab creation failed.' });
  }
}

// 1. Listen for internal messages (from popup script or content scripts)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'AUTO_LOGIN' || request.action === 'OPEN_AND_AUTOFILL' || request.action === 'LAUNCH_AND_FILL') {
    const reqData = request.payload || request;
    handleAutoLoginRequest(reqData, sendResponse);
    return true; // Async response
  }

  // Content script querying pending credentials upon page load
  if (request.action === 'GET_PENDING_CREDENTIALS') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ credentials: null });
      return false;
    }

    const storageKey = `pending_autofill_${tabId}`;
    getStorage().get([storageKey], (result) => {
      const creds = result[storageKey] || null;
      sendResponse({ credentials: creds });

      // Retain credentials for multi-step redirects (expire after 60s)
      if (creds) {
        setTimeout(() => {
          getStorage().remove([storageKey]);
        }, 60000);
      }
    });
    return true; // Async response
  }

  // Handle isolated session window requests
  if (request.action === 'LAUNCH_ISOLATED_SESSION' && request.url) {
    const isIncognito = request.incognito !== false;
    chrome.windows.create({
      url: request.url,
      incognito: isIncognito,
      type: 'popup',
      width: 650,
      height: 800
    }, (newWin) => {
      sendResponse({ status: 'success', windowId: newWin?.id });
    });
    return true;
  }
});

// 2. Listen for external messages (from web apps e.g. localhost:5173 dashboard)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'AUTO_LOGIN' || request.action === 'OPEN_AND_AUTOFILL' || request.action === 'LAUNCH_AND_FILL') {
    const reqData = request.payload || request;
    handleAutoLoginRequest(reqData, sendResponse);
    return true; // Async response
  }
});

// 3. Monitor tab updates to send auto-fill payload as soon as tab begins loading or completes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' || changeInfo.status === 'complete') {
    const storageKey = `pending_autofill_${tabId}`;

    getStorage().get([storageKey], (result) => {
      const credentials = result[storageKey];
      if (credentials) {
        // Attempt sending AUTOFILL message to tab content script
        chrome.tabs.sendMessage(tabId, {
          action: 'AUTOFILL',
          credentials
        }, (response) => {
          if (chrome.runtime.lastError) {
            // If content script was not pre-injected, inject it dynamically via Scripting API
            chrome.scripting.executeScript({
              target: { tabId },
              files: ['content.js']
            }, () => {
              chrome.tabs.sendMessage(tabId, { action: 'AUTOFILL', credentials });
            });
          }
        });

        // Retain credentials for multi-step redirects (expire after 60s)
        setTimeout(() => {
          getStorage().remove([storageKey]);
        }, 60000);
      }
    });
  }
});
