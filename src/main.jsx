import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { runInvitationLifecycleTests } from './utils/invitationLifecycle.test.js'

if (import.meta.env.DEV) {
  try {
    runInvitationLifecycleTests();
  } catch (err) {
    console.error('[Tests] Error running invitation lifecycle tests:', err);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
