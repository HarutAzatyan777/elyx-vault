import { afterEach, expect, it } from 'vitest';
import { runWorkspaceValidationTests } from '../src/utils/workspaceValidation.test.js';
import { runInvitationLifecycleTests } from '../src/utils/invitationLifecycle.test.js';
import { runRemoteTerminalTests } from '../src/utils/remoteTerminal.test.js';
import { runAppRegistryTests } from '../src/os/registry/appRegistry.test.js';
import { runDesktopShellTests } from '../src/os/desktop/desktop.test.js';
import { runDockAndLauncherTests } from '../src/os/dock/dock.test.js';
import { runMobileOSTests } from '../src/os/mobile/mobile.test.js';
import { runWindowManagerTests } from '../src/os/windows/windowManager.test.js';
import { runVirtualDesktopsAndSnappingTests } from '../src/os/workspaces/workspaces.test.js';
import { runFileManagerAndIntegrationTests } from '../src/os/files/fileManager.test.js';
afterEach(() => localStorage.clear());
for (const [name, run] of Object.entries({
  urls: runWorkspaceValidationTests,
  invitations: runInvitationLifecycleTests,
  terminal: runRemoteTerminalTests,
  registry: runAppRegistryTests,
  desktop: runDesktopShellTests,
  dock: runDockAndLauncherTests,
  mobile: runMobileOSTests,
  windows: runWindowManagerTests,
  workspaces: runVirtualDesktopsAndSnappingTests,
  files: runFileManagerAndIntegrationTests,
})) {
  it(`existing ${name} assertions`, () => {
    const result = run();
    if (result?.failed !== undefined) expect(result.failed).toBe(0);
  });
}
