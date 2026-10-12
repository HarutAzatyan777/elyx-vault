/**
 * Elyx OS 1.0 — Public Architecture Entrypoint
 */

// Registry
export * from './registry/appRegistry.js';
export * from './registry/categories.js';

// Configuration & Feature Flags
export * from './config/featureFlags.js';
export * from './settings/settingsConfig.js';

// Contexts & Providers
export { OSContext, OSProvider } from './contexts/OSContext.jsx';
export {
  WindowManagerContext,
  WindowManagerProvider,
} from './contexts/WindowManagerContext.jsx';

// Hooks
export { useOS } from './hooks/useOS.js';
export { useWindowManager } from './hooks/useWindowManager.js';
export { useAppRegistry } from './hooks/useAppRegistry.js';
export { useNotifications } from './hooks/useNotifications.js';

// Types and Constants
export * from './windows/types.js';
export * from './dock/types.js';
export * from './launcher/types.js';
export * from './desktop/types.js';
export * from './mobile/types.js';
export * from './workspaces/types.js';
export * from './notifications/types.js';
export * from './shell/index.js';

// Shell & Desktop Components
export { DesktopShell } from './shell/DesktopShell.jsx';
export { TopBar } from './shell/TopBar.jsx';
export { DesktopCanvas } from './desktop/DesktopCanvas.jsx';
export { DesktopIcon } from './desktop/DesktopIcon.jsx';
export { DesktopWidgets } from './desktop/DesktopWidgets.jsx';
export { AppStageAdapter } from './desktop/AppStageAdapter.jsx';
export { WindowFrame } from './windows/WindowFrame.jsx';
export { WindowManagerStage } from './windows/WindowManagerStage.jsx';
export { Dock } from './dock/Dock.jsx';
export { AppLauncher } from './launcher/AppLauncher.jsx';
export { CommandPalette } from './launcher/CommandPalette.jsx';
export { FileManager } from './files/FileManager.jsx';
export { SystemSettingsApp } from './settings/SystemSettingsApp.jsx';
export { ExtensionToolsApp } from './settings/ExtensionToolsApp.jsx';

