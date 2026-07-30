/**
 * Elyx Vault Background Service Worker (Manifest V3)
 * Development Hot-Reload Poller: Automatically reloads extension when code changes are saved.
 */

const HOT_RELOAD_URL = 'http://localhost:8890/last-updated';
let lastKnownTimestamp = null;

function checkHotReload() {
  fetch(HOT_RELOAD_URL)
    .then((res) => res.json())
    .then((data) => {
      if (lastKnownTimestamp === null) {
        lastKnownTimestamp = data.timestamp;
      } else if (data.timestamp > lastKnownTimestamp) {
        console.log('[Elyx Hot Reload] Code change detected. Reloading extension...');
        lastKnownTimestamp = data.timestamp;
        chrome.runtime.reload();
      }
    })
    .catch(() => {
      // Hot reload server not running; fail silently in normal mode
    });
}

// Poll local dev server every 1 second
setInterval(checkHotReload, 1000);
