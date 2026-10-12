import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { runInvitationLifecycleTests } from './utils/invitationLifecycle.test.js'
import { runAppRegistryTests } from './os/registry/appRegistry.test.js'
import { runDesktopShellTests } from './os/desktop/desktop.test.js'
import { runWindowManagerTests } from './os/windows/windowManager.test.js'
import { runDockAndLauncherTests } from './os/dock/dock.test.js'
import { runFileManagerAndIntegrationTests } from './os/files/fileManager.test.js'
import { runVirtualDesktopsAndSnappingTests } from './os/workspaces/workspaces.test.js'
import { runMobileOSTests } from './os/mobile/mobile.test.js'

if (import.meta.env.DEV) {
  try {
    runInvitationLifecycleTests();
    runAppRegistryTests();
    runDesktopShellTests();
    runWindowManagerTests();
    runDockAndLauncherTests();
    runFileManagerAndIntegrationTests();
    runVirtualDesktopsAndSnappingTests();
    runMobileOSTests();
  } catch (err) {
    console.error('[Tests] Error running tests:', err);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
