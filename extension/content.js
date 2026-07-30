/**
 * Elyx Vault Chrome Extension Content Script (Manifest V3)
 * Injected into web pages across domains (Google, GitHub, GitLab, etc.) to auto-fill credentials.
 * Supports cross-context background messaging, active pulling of pending credentials,
 * and multi-step automated login flows.
 */

(() => {
  /**
   * Synchronously cached credentials payload to avoid async promise lookup delays
   * during rapid SPA step transitions.
   */
  let cachedCredentials = { email: '', password: '' };

  // Hydrate synchronous cache from sessionStorage if available across page redirects
  try {
    const saved = sessionStorage.getItem('__elyx_cached_creds');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.email || parsed.password)) {
        cachedCredentials = parsed;
      }
    }
  } catch (e) {}

  /**
   * Updates in-memory synchronous credentials cache and syncs to sessionStorage.
   *
   * @param {{ email?: string, username?: string, password?: string }} credentials
   */
  function updateCachedCredentials(credentials) {
    if (!credentials) return;
    if (credentials.email) cachedCredentials.email = credentials.email;
    if (credentials.username && !cachedCredentials.email) cachedCredentials.email = credentials.username;
    if (credentials.password) cachedCredentials.password = credentials.password;

    try {
      sessionStorage.setItem('__elyx_cached_creds', JSON.stringify(cachedCredentials));
    } catch (e) {}
  }

  /**
   * Safely fills an HTML input element and dispatches standard DOM events
   * to ensure React, Vue, Angular, and legacy forms update their internal state.
   *
   * @param {HTMLInputElement} element - Target input element
   * @param {string} value - Text value to insert
   */
  function fillInputValue(element, value) {
    if (!element || value === undefined || value === null || value === '') return;
    
    try {
      element.focus();
    } catch (e) {}

    // Use native prototype setter to support React, Angular, Vue and native forms
    try {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, value);
      } else {
        element.value = value;
      }
    } catch (e) {
      element.value = value;
    }

    // Dispatch full synthetic event lifecycle for React, Angular, and native forms
    try {
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
    } catch (e) {}
  }

  /**
   * Safely clicks a button element and dispatches click event.
   *
   * @param {HTMLElement} element
   */
  function clickElement(element) {
    if (!element) return;
    try {
      element.focus();
      element.click();
    } catch (e) {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  }

  /**
   * Finds and fills username/email & password fields on generic single-step login pages.
   *
   * @param {{ email?: string, username?: string, password?: string }} credentials
   * @returns {boolean} Whether both email and password fields were found and filled
   */
  function fillStandardForm(credentials) {
    const emailValue = credentials.email || credentials.username || '';
    const passwordValue = credentials.password || '';

    const emailSelectors = [
      '#login_field',                 // GitHub
      '#user_login',                  // GitLab / WordPress
      'input[name="login"]',          // GitHub / GitLab
      'input[name="user[login]"]',     // GitLab
      'input[name="session[username_or_email]"]', // Twitter/X
      'input[type="email"]',
      'input[name="username"]',
      'input[name="email"]',
      'input[name="user"]',
      'input[name="identifier"]',
      'input[id*="email" i]',
      'input[id*="user" i]',
      'input[id*="login" i]',
      'input[id*="identifier" i]',
      '#identifierId'
    ];

    const passwordSelectors = [
      '#password',                    // GitHub / GitLab
      '#user_password',               // GitLab / WordPress
      'input[name="password"]',       // GitHub / GitLab / Generic
      'input[name="user[password]"]', // GitLab
      'input[type="password"]',
      'input[name="pass"]',
      'input[name="Passwd"]',
      'input[id*="password" i]',
      'input[id*="pass" i]'
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        emailInput = el;
        break;
      }
    }

    let passwordInput = null;
    for (const selector of passwordSelectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        passwordInput = el;
        break;
      }
    }

    let filledEmail = false;
    let filledPassword = false;

    if (emailInput && emailValue) {
      fillInputValue(emailInput, emailValue);
      filledEmail = true;
    }

    if (passwordInput && passwordValue) {
      fillInputValue(passwordInput, passwordValue);
      filledPassword = true;
    }

    return filledEmail && filledPassword;
  }

  /**
   * Handles multi-step login flows (e.g., Google accounts.google.com, Microsoft).
   * Step 1: Polls DOM for email input, injects email (auto-appending @gmail.com for Google if missing),
   * dispatches events, and clicks Next.
   * Step 2: Observe DOM for password field appearance, fill password, and click Next/Submit.
   *
   * @param {{ email?: string, username?: string, password?: string }} credentials
   */
  function handleMultiStepLogin(credentials) {
    updateCachedCredentials(credentials);

    let rawEmail = credentials.email || credentials.username || cachedCredentials.email || '';
    // Auto-append @gmail.com if domain is missing on Google Sign-In
    if (rawEmail && !rawEmail.includes('@') && window.location.hostname.includes('google.com')) {
      rawEmail += '@gmail.com';
    }

    const passwordValue = credentials.password || cachedCredentials.password || '';

    const isPasswordStep = window.location.pathname.includes('/challenge/pwd') ||
                           !!document.querySelector('input[type="password"]');

    if (isPasswordStep) {
      observeAndFillPassword(passwordValue);
      return;
    }

    let emailFilled = false;

    function tryFillEmail() {
      if (emailFilled || !rawEmail) return true;

      const emailSelectors = [
        'input[type="email"]',
        '#identifierId',
        'input[name="identifier"]',
        '#login_field',
        '#user_login',
        'input[name="login"]',
        'input[name="email"]',
        'input[name="user"]',
        'input[id*="email" i]',
        'input[id*="identifier" i]',
        'input[id*="user" i]',
        'input[id*="login" i]'
      ];

      for (const sel of emailSelectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null && !el.disabled) {
          emailFilled = true;
          fillInputValue(el, rawEmail);

          setTimeout(() => {
            const nextBtn = document.querySelector('#identifierNext button, #identifierNext, button[type="submit"], button[data-primary-action="true"]');
            if (nextBtn) {
              clickElement(nextBtn);
            }
            observeAndFillPassword(passwordValue);
          }, 350);

          return true;
        }
      }
      return false;
    }

    // 1. Synchronous attempt (0ms delay)
    if (tryFillEmail()) return;

    // 2. High-frequency polling (every 40ms)
    let attempts = 0;
    const maxAttempts = 100;
    let observer = null;

    const cleanup = () => {
      if (pollInterval) clearInterval(pollInterval);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    const pollInterval = setInterval(() => {
      attempts++;
      if (tryFillEmail() || attempts >= maxAttempts) {
        cleanup();
        observeAndFillPassword(passwordValue);
      }
    }, 40);

    // 3. MutationObserver for instant DOM insertion reaction
    if (window.MutationObserver) {
      observer = new MutationObserver(() => {
        if (tryFillEmail()) {
          cleanup();
        }
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    setTimeout(cleanup, 8000);
  }

  /**
   * Step 2: Synchronously uses cached password (or parameter) and polls DOM to inject password,
   * trigger React/Angular events, and click the final Next button without async delays.
   *
   * @param {string} [password]
   */
  function observeAndFillPassword(password) {
    try {
      const targetPassword = password || cachedCredentials.password;

      if (!targetPassword) {
        console.warn('[Elyx Vault] Auto-login step 2 waiting for credentials...');
        return;
      }

      const passwordSelectors = [
        'input[type="password"]',
        'input[name="Passwd"]',
        '#password',
        '#user_password',
        'input[name="password"]',
        'input[id*="password" i]',
        'input[id*="pass" i]'
      ];

      let filled = false;

      function isElementInteractable(el) {
        if (!el || el.disabled || el.readOnly) return false;
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          el.offsetParent !== null
        );
      }

      function tryFillPassword() {
        if (filled) return true;

        try {
          for (const selector of passwordSelectors) {
            const passwordInput = document.querySelector(selector);
            if (passwordInput && isElementInteractable(passwordInput)) {
              filled = true;

              // Inject password & trigger React/Angular event pipeline instantly
              fillInputValue(passwordInput, targetPassword);

              // Click final Next / Sign-in button after slight DOM update delay
              setTimeout(() => {
                const finalNextSelectors = [
                  '#passwordNext button',
                  '#passwordNext',
                  '#submitButton',
                  'button[type="submit"]',
                  'input[type="submit"]',
                  'button[id*="submit" i]',
                  'button[id*="next" i]',
                  'button[id*="signin" i]',
                  'button[name*="submit" i]',
                  'button[data-primary-action="true"]'
                ];

                for (const sel of finalNextSelectors) {
                  const btn = document.querySelector(sel);
                  if (btn && isElementInteractable(btn)) {
                    clickElement(btn);
                    break;
                  }
                }
              }, 400);

              return true;
            }
          }
        } catch (err) {
          console.error('[Elyx Vault] Error during password field fill attempt:', err);
        }
        return false;
      }

      // 1. Immediate Synchronous Check (0ms delay)
      if (tryFillPassword()) return;

      // 2. Polling interval (runs every 150ms for up to 8 seconds / 50 attempts)
      let attempts = 0;
      const maxAttempts = 50;
      let observer = null;

      const cleanup = () => {
        if (pollInterval) clearInterval(pollInterval);
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      };

      const pollInterval = setInterval(() => {
        attempts++;
        if (tryFillPassword() || attempts >= maxAttempts) {
          cleanup();
        }
      }, 150);

      // 3. MutationObserver for responsive SPA DOM mutations
      if (window.MutationObserver) {
        observer = new MutationObserver(() => {
          if (tryFillPassword()) {
            cleanup();
          }
        });

        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class', 'type', 'hidden', 'disabled']
        });
      }

      // Hard safety timeout after 8 seconds
      setTimeout(cleanup, 8000);

    } catch (error) {
      console.error('[Elyx Vault] Step 2 Password observe error:', error);
    }
  }

  /**
   * Main entry point to initiate auto-fill sequence based on site type.
   *
   * @param {{ email?: string, username?: string, password?: string }} credentials
   */
  function triggerAutofillSequence(credentials) {
    if (!credentials) return;
    updateCachedCredentials(credentials);

    const isGoogle = window.location.hostname.includes('accounts.google.com');
    const isPasswordStep = window.location.pathname.includes('/challenge/pwd') ||
                           !!document.querySelector('input[type="password"]');

    if (isPasswordStep) {
      observeAndFillPassword(cachedCredentials.password);
      return;
    }

    if (isGoogle) {
      handleMultiStepLogin(credentials);
    } else {
      const bothFilled = fillStandardForm(credentials);
      if (!bothFilled) {
        handleMultiStepLogin(credentials);
      }
    }
  }

  /**
   * Checks for URL hash token (#elyx_autofill=...) fallback
   */
  function checkUrlHashAutofill() {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('elyx_autofill=')) {
        const match = hash.match(/elyx_autofill=([^&]+)/);
        if (match && match[1]) {
          const rawPayload = decodeURIComponent(atob(match[1]));
          const credentials = JSON.parse(rawPayload);

          // Instantly wipe hash fragment from address bar for security
          if (window.history && window.history.replaceState) {
            const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search;
            window.history.replaceState(null, document.title, cleanUrl);
          }

          if (credentials && (credentials.email || credentials.password)) {
            triggerAutofillSequence(credentials);
          }
        }
      }
    } catch (e) {
      console.error('[Elyx Vault] Auto-login payload parsing error:', e);
    }
  }

  // 1. Listen for background push messages (from tabUpdated event or popup)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if ((request.action === 'AUTOFILL' || request.action === 'AUTOFILL_GMAIL' || request.action === 'AUTO_LOGIN') && request.credentials) {
      updateCachedCredentials(request.credentials);
      triggerAutofillSequence(request.credentials);
      sendResponse({ status: 'success', message: 'Auto-fill sequence triggered.' });
    }
    return true;
  });

  // 2. Query background service worker upon page load for any pending credentials
  try {
    chrome.runtime.sendMessage({ action: 'GET_PENDING_CREDENTIALS' }, (response) => {
      if (!chrome.runtime.lastError && response && response.credentials) {
        updateCachedCredentials(response.credentials);
        triggerAutofillSequence(response.credentials);
      } else if (cachedCredentials.password || cachedCredentials.email) {
        triggerAutofillSequence(cachedCredentials);
      }
    });
  } catch (e) {
    if (cachedCredentials.password || cachedCredentials.email) {
      triggerAutofillSequence(cachedCredentials);
    }
  }

  // 3. Fallback check for URL hash tokens on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkUrlHashAutofill);
  } else {
    checkUrlHashAutofill();
  }

  // 4. Immediate execution check on load if page is already at the password challenge screen
  const isPasswordPage = window.location.pathname.includes('/challenge/pwd') ||
                         !!document.querySelector('input[type="password"]');
  if (isPasswordPage && cachedCredentials.password) {
    observeAndFillPassword(cachedCredentials.password);
  }

  // 5. Global Bridge Listener for Web-to-Extension Communication (React Dashboard -> Content Script -> Background)
  const handleLaunchRequest = (payload) => {
    if (!payload || typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return;
    const targetUrl = payload.url || 'https://accounts.google.com/v3/signin/identifier?prompt=select_account&flowName=GlifWebSignIn&flowEntry=AddSession';
    const credentials = payload.credentials || {
      email: payload.email || payload.username || '',
      password: payload.password || ''
    };

    try {
      if (!chrome.runtime || !chrome.runtime.id) return;
      chrome.runtime.sendMessage({
        action: 'LAUNCH_AND_FILL',
        payload: {
          url: targetUrl,
          credentials: credentials
        }
      }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {}
      });
    } catch (e) {}
  };

  // 5a. Listen for Custom Events
  window.addEventListener('ELYX_LAUNCH_LOGIN', (e) => {
    if (e.detail) handleLaunchRequest(e.detail);
  });

  // 5b. Listen for window.postMessage
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data && (event.data.type === 'ELYX_LAUNCH_LOGIN' || event.data.action === 'ELYX_LAUNCH_LOGIN')) {
      handleLaunchRequest(event.data.payload || event.data.detail);
    }
  });
})();
