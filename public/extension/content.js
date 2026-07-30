/**
 * Elyx Vault Chrome Extension Content Script (Manifest V3)
 * Injected into web pages across domains (GitHub, GitLab, Google, etc.) to securely auto-fill credentials.
 */

(() => {
  /**
   * Safely fills an HTML input element and dispatches standard DOM events
   * to ensure React, Vue, Angular, and legacy forms update their internal state.
   *
   * @param {HTMLInputElement} element - Target input element
   * @param {string} value - Text value to insert
   */
  function fillInputValue(element, value) {
    if (!element || value === undefined || value === null) return;

    element.focus();

    // Use HTMLInputElement prototype setter if available (bypasses React state overrides)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Trigger full event lifecycle
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.slice(-1) || 'a' }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: value.slice(-1) || 'a' }));
    element.blur();
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
   * Finds and fills username/email & password fields on generic and domain-specific single-step login pages.
   * Supports GitHub, GitLab, Bitbucket, Amazon, Google, and standard forms.
   *
   * @param {{ email?: string, username?: string, password?: string }} credentials
   * @returns {boolean} Whether both email and password fields were found and filled
   */
  function fillStandardForm(credentials) {
    const emailValue = credentials.email || credentials.username || '';
    const passwordValue = credentials.password || '';

    // Email / Username Selectors across popular platforms
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

    // Password Selectors across popular platforms
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
      if (el && el.offsetParent !== null) { // Check visibility
        emailInput = el;
        break;
      }
    }

    let passwordInput = null;
    for (const selector of passwordSelectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) { // Check visibility
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
   * Step 1: Inject email, dispatch input/change events, and click Next.
   * Step 2: Observe DOM for password field appearance, fill password, and click Next/Submit.
   *
   * @param {{ email?: string, username?: string, password?: string }} credentials
   */
  function handleMultiStepLogin(credentials) {
    const emailValue = credentials.email || credentials.username || '';
    const passwordValue = credentials.password || '';

    const emailSelectors = [
      'input[type="email"]',
      '#identifierId',
      'input[name="identifier"]',
      '#login_field',
      '#user_login',
      'input[name="login"]',
      'input[name="username"]',
      'input[name="email"]',
      'input[id*="email" i]',
      'input[id*="user" i]',
      'input[id*="identifier" i]',
      'input[type="text"]'
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        emailInput = el;
        break;
      }
    }

    if (emailInput && emailValue) {
      // Step 1: Fill Email Input
      fillInputValue(emailInput, emailValue);

      // Click "Next" / Submit button for Step 1
      setTimeout(() => {
        const nextButtonSelectors = [
          '#identifierNext button',
          '#identifierNext',
          'button[type="submit"]',
          'input[type="submit"]',
          'button[id*="next" i]',
          'button[name*="next" i]',
          'button[data-primary-action="true"]'
        ];

        let nextBtn = null;
        for (const sel of nextButtonSelectors) {
          const btn = document.querySelector(sel);
          if (btn && btn.offsetParent !== null) {
            nextBtn = btn;
            break;
          }
        }

        if (nextBtn) {
          clickElement(nextBtn);
        }

        // Proceed to Step 2: Observe for Password input field
        observeAndFillPassword(passwordValue);
      }, 350);
    } else {
      // Email already filled or not found; proceed to observe Password field
      observeAndFillPassword(passwordValue);
    }
  }

  /**
   * Step 2: Uses MutationObserver + polling fallback to detect when password field appears in DOM,
   * fills password, dispatches events, and automatically clicks final Next / Sign-in button.
   *
   * @param {string} password
   */
  function observeAndFillPassword(password) {
    if (!password) return;

    const passwordSelectors = [
      'input[type="password"]',
      '#password',
      '#user_password',
      'input[name="Passwd"]',
      'input[name="password"]',
      'input[id*="password" i]',
      'input[id*="pass" i]'
    ];

    let filled = false;

    function tryFillPassword() {
      if (filled) return true;

      for (const selector of passwordSelectors) {
        const passwordInput = document.querySelector(selector);
        if (passwordInput && passwordInput.offsetParent !== null) {
          filled = true;

          // Fill Password Input
          fillInputValue(passwordInput, password);

          // Click final Next / Sign-in button after short delay
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
              'button[name*="submit" i]'
            ];

            for (const sel of finalNextSelectors) {
              const btn = document.querySelector(sel);
              if (btn && btn.offsetParent !== null) {
                clickElement(btn);
                break;
              }
            }
          }, 350);

          return true;
        }
      }
      return false;
    }

    // 1. Immediate Check
    if (tryFillPassword()) return;

    // 2. MutationObserver for DOM changes
    const observer = new MutationObserver(() => {
      if (tryFillPassword()) {
        observer.disconnect();
        if (pollInterval) clearInterval(pollInterval);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'type', 'hidden']
    });

    // 3. Polling Fallback
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = setInterval(() => {
      attempts++;
      if (tryFillPassword() || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        observer.disconnect();
      }
    }, 200);

    // Timeout safety to clean up listeners
    setTimeout(() => {
      observer.disconnect();
      if (pollInterval) clearInterval(pollInterval);
    }, 10000);
  }

  // Listen for messages from popup script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if ((request.action === 'AUTOFILL' || request.action === 'AUTOFILL_GMAIL') && request.credentials) {
      const isGoogle = window.location.hostname.includes('accounts.google.com');
      const passwordInput = document.querySelector('input[type="password"]');

      if (isGoogle || !passwordInput) {
        handleMultiStepLogin(request.credentials);
      } else {
        const bothFilled = fillStandardForm(request.credentials);
        if (!bothFilled) {
          handleMultiStepLogin(request.credentials);
        }
      }

      sendResponse({ status: 'success', message: 'Auto-fill sequence initiated.' });
    }
    return true;
  });
})();
