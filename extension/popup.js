/**
 * Elyx Vault Chrome Extension Popup Script (Manifest V3)
 * Handles Firebase Authentication, Firestore Project Fetching, AES Decryption,
 * Dynamic Active Domain Detection, Domain Filtering, and Auto-Filling.
 */

// Firebase Configuration from .env
const FIREBASE_API_KEY = 'AIzaSyDFBAWRjJU62oIJGNS9Brj_XjG4gkmQjRE';
const FIREBASE_PROJECT_ID = 'elyx-vault';

// Global state
let state = {
  idToken: null,
  userEmail: null,
  masterPassword: null,
  projects: [],
  activeDomain: '',
  activeTabId: null,
  selectedProjectId: null
};

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const loginView = document.getElementById('login-view');
  const vaultView = document.getElementById('vault-view');
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');
  const loginBtnText = document.getElementById('login-btn-text');
  const loginSpinner = document.getElementById('login-spinner');
  const logoutBtn = document.getElementById('logout-btn');
  const errorBanner = document.getElementById('error-banner');
  const statusMsg = document.getElementById('status-msg');

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const masterPasswordInput = document.getElementById('master-password');

  const activeDomainEl = document.getElementById('active-domain');
  const projectSelect = document.getElementById('project-select');
  const projectCard = document.getElementById('project-card');
  const cardTitle = document.getElementById('card-title');
  const cardUrl = document.getElementById('card-url');
  const autofillBtn = document.getElementById('autofill-btn');
  const copyPassBtn = document.getElementById('copy-pass-btn');

  // Detect Active Tab URL & Domain
  await detectActiveTab();

  // Check saved session in storage
  chrome.storage.local.get(['idToken', 'userEmail', 'masterPassword'], async (result) => {
    if (result.idToken && result.masterPassword) {
      state.idToken = result.idToken;
      state.userEmail = result.userEmail;
      state.masterPassword = result.masterPassword;
      
      const success = await fetchAndLoadProjects();
      if (success) {
        showVaultView();
        return;
      }
    }
    showLoginView();
  });

  // Handle Login Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    clearStatus();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const masterPassword = masterPasswordInput.value;

    if (!email || !password || !masterPassword) {
      showError('Please fill in all fields (Email, Password, and Master Password).');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Authenticate using Firebase Auth REST API
      const authData = await firebaseSignIn(email, password);
      
      state.idToken = authData.idToken;
      state.userEmail = authData.email || email;
      state.masterPassword = masterPassword;

      // Save session to storage
      chrome.storage.local.set({
        idToken: state.idToken,
        userEmail: state.userEmail,
        masterPassword: state.masterPassword
      });

      // 2. Fetch Projects from Firestore
      const loaded = await fetchAndLoadProjects();
      if (loaded) {
        showVaultView();
      }
    } catch (err) {
      console.error('[Auth Error]', err);
      showError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  });

  // Handle Logout / Lock
  logoutBtn.addEventListener('click', () => {
    state.idToken = null;
    state.userEmail = null;
    state.masterPassword = null;
    state.projects = [];
    state.selectedProjectId = null;
    chrome.storage.local.remove(['idToken', 'userEmail', 'masterPassword']);
    showLoginView();
    clearStatus();
  });

  // Handle Project Selection Change
  projectSelect.addEventListener('change', (e) => {
    state.selectedProjectId = e.target.value;
    updateSelectedProjectCard();
  });

  // Handle Auto-fill Action
  autofillBtn.addEventListener('click', async () => {
    clearStatus();
    const selected = getSelectedProject();
    if (!selected) {
      showStatus('Please select a project to auto-fill.', false);
      return;
    }

    const decryptedCredentials = decryptProjectCredentials(selected);
    if (!decryptedCredentials) {
      showStatus('Decryption failed! Verify your Master Password.', false);
      return;
    }

    if (!state.activeTabId) {
      showStatus('No active tab detected.', false);
      return;
    }

    // Pass exact email/username stored in loginUrl or decrypted credentials to content script
    const payload = {
      action: 'AUTOFILL',
      credentials: {
        email: decryptedCredentials.email,
        username: decryptedCredentials.email,
        password: decryptedCredentials.password
      }
    };

    // Send message to active tab content script
    chrome.tabs.sendMessage(state.activeTabId, payload, (response) => {
      if (chrome.runtime.lastError) {
        // Fallback: execute content script via scripting API if not pre-injected
        chrome.scripting.executeScript({
          target: { tabId: state.activeTabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            showStatus('Failed to inject content script.', false);
            return;
          }
          setTimeout(() => {
            chrome.tabs.sendMessage(state.activeTabId, payload, (res) => {
              showStatus('Auto-fill credentials injected successfully!', true);
            });
          }, 50);
        });
      } else {
        showStatus('Auto-fill credentials injected successfully!', true);
      }
    });
  });

  // Handle Copy Password Action
  copyPassBtn.addEventListener('click', async () => {
    clearStatus();
    const selected = getSelectedProject();
    if (!selected) {
      showStatus('Please select a project.', false);
      return;
    }

    const decryptedCredentials = decryptProjectCredentials(selected);
    if (!decryptedCredentials || !decryptedCredentials.password) {
      showStatus('Decryption failed! Verify your Master Password.', false);
      return;
    }

    try {
      await navigator.clipboard.writeText(decryptedCredentials.password);
      showStatus('Password copied to clipboard!', true);
    } catch (err) {
      showStatus('Failed to copy password.', false);
    }
  });

  /* --- Helper Functions --- */

  async function firebaseSignIn(email, password) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const msg = data.error?.message || 'Firebase login failed.';
      if (msg.includes('INVALID_PASSWORD') || msg.includes('EMAIL_NOT_FOUND') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
        throw new Error('Invalid email or password.');
      }
      throw new Error(msg);
    }

    return data;
  }

  async function fetchAndLoadProjects() {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/projects`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${state.idToken}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to fetch projects from Firestore.');
      }

      const data = await response.json();
      const rawDocs = data.documents || [];

      state.projects = rawDocs.map(doc => {
        const fields = doc.fields || {};
        const id = doc.name ? doc.name.split('/').pop() : Math.random().toString();
        const projectName = fields.name?.stringValue || fields.projectName?.stringValue || 'Untitled Project';
        const loginUrl = fields.loginUrl?.stringValue || fields.url?.stringValue || '';
        const username = fields.username?.stringValue || fields.email?.stringValue || fields.user?.stringValue || fields.login?.stringValue || '';
        const encryptedCredentials = fields.encryptedCredentials?.stringValue || fields.encryptedPassword?.stringValue || fields.secret?.stringValue || fields.password?.stringValue || '';

        return {
          id,
          name: projectName,
          projectName: projectName,
          loginUrl: loginUrl,
          username: username,
          email: username,
          encryptedCredentials: encryptedCredentials
        };
      });

      populateProjectSelect();
      return true;
    } catch (err) {
      console.error('[Firestore Fetch Error]', err);
      showError(err.message);
      return false;
    }
  }

  async function detectActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        state.activeTabId = tab.id;
        if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
          const urlObj = new URL(tab.url);
          state.activeDomain = urlObj.hostname.replace(/^www\./, '');
        } else {
          state.activeDomain = 'Local Page / Browser UI';
        }
      } else {
        state.activeDomain = 'Unknown Site';
      }
    } catch (err) {
      state.activeDomain = 'Unknown Site';
    }
    if (activeDomainEl) {
      activeDomainEl.textContent = state.activeDomain;
    }
  }

  function populateProjectSelect() {
    projectSelect.innerHTML = '';

    if (state.projects.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- No Saved Projects Found --';
      projectSelect.appendChild(opt);
      projectCard.style.display = 'none';
      autofillBtn.disabled = true;
      state.selectedProjectId = null;
      return;
    }

    autofillBtn.disabled = false;

    // Filter/Sort projects matching active domain first
    const matchedProjects = [];
    const otherProjects = [];

    state.projects.forEach(project => {
      const matchUrl = (project.loginUrl || '').toLowerCase();
      const matchName = (project.name || '').toLowerCase();
      const domain = state.activeDomain.toLowerCase();

      // Flexible matching for domains (e.g. github.com, gitlab.com, google.com)
      if (domain && domain !== 'unknown site' && domain !== 'local page / browser ui' &&
         (matchUrl.includes(domain) || domain.includes(matchUrl) || matchName.includes(domain))) {
        matchedProjects.push(project);
      } else {
        otherProjects.push(project);
      }
    });

    if (matchedProjects.length > 0) {
      const group = document.createElement('optgroup');
      group.label = `Matching (${state.activeDomain})`;
      matchedProjects.forEach(p => group.appendChild(createOption(p)));
      projectSelect.appendChild(group);
    }

    if (otherProjects.length > 0) {
      const group = document.createElement('optgroup');
      group.label = matchedProjects.length > 0 ? 'All Other Projects' : 'Saved Projects';
      otherProjects.forEach(p => group.appendChild(createOption(p)));
      projectSelect.appendChild(group);
    }

    // Set active selection
    if (projectSelect.options.length > 0) {
      state.selectedProjectId = projectSelect.value;
    }

    updateSelectedProjectCard();
  }

  function createOption(project) {
    const opt = document.createElement('option');
    opt.value = project.id;
    opt.textContent = project.name + (project.loginUrl ? ` (${project.loginUrl})` : '');
    return opt;
  }

  function updateSelectedProjectCard() {
    const selected = getSelectedProject();
    if (selected) {
      cardTitle.textContent = selected.name;
      cardUrl.textContent = selected.loginUrl || 'No Login URL specified';
      projectCard.style.display = 'block';
    } else {
      projectCard.style.display = 'none';
    }
  }

  function getSelectedProject() {
    const selectedId = projectSelect.value || state.selectedProjectId;
    if (!selectedId) return null;
    return state.projects.find(p => String(p.id) === String(selectedId)) || null;
  }

  function decryptProjectCredentials(project) {
    if (!project || !state.masterPassword) {
      return null;
    }

    let email = project.username || project.email || '';
    let password = '';

    const encrypted = project.encryptedCredentials;

    if (encrypted) {
      try {
        const bytes = CryptoJS.AES.decrypt(encrypted, state.masterPassword);
        if (bytes && bytes.sigBytes > 0) {
          const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
          if (decryptedStr) {
            try {
              const json = JSON.parse(decryptedStr);
              if (typeof json === 'object' && json !== null) {
                email = json.email || json.username || json.login || json.user || json.identifier || email;
                password = json.password || json.pass || json.secret || decryptedStr;
              } else {
                password = decryptedStr;
              }
            } catch (e) {
              // Plaintext secret/password
              password = decryptedStr;
            }
          }
        }
      } catch (err) {
        console.error('[Decryption Error]', err);
      }
    }

    // If email/username is not inside JSON payload, extract it from loginUrl (which holds the username/email)
    if (!email && project.loginUrl) {
      const emailMatch = project.loginUrl.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        email = emailMatch[0];
      } else {
        email = project.loginUrl.trim();
      }
    }

    return {
      email: email,
      username: email,
      password: password
    };
  }

  function showLoginView() {
    loginView.classList.add('active');
    vaultView.classList.remove('active');
    logoutBtn.style.display = 'none';
    hideError();
  }

  function showVaultView() {
    loginView.classList.remove('active');
    vaultView.classList.add('active');
    logoutBtn.style.display = 'block';
    hideError();
  }

  function setSubmitting(isSubmitting) {
    loginBtn.disabled = isSubmitting;
    loginBtnText.style.display = isSubmitting ? 'none' : 'inline';
    loginSpinner.style.display = isSubmitting ? 'inline-block' : 'none';
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = 'block';
  }

  function hideError() {
    errorBanner.style.display = 'none';
    errorBanner.textContent = '';
  }

  function showStatus(msg, isSuccess) {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${isSuccess ? 'status-success' : 'status-error'}`;
    setTimeout(() => {
      statusMsg.textContent = '';
    }, 4000);
  }

  function clearStatus() {
    statusMsg.textContent = '';
    statusMsg.className = 'status-msg';
  }
});
