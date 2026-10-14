import { lazy } from 'react';
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
export const DesktopShell = lazy(() => import('./shell/DesktopShell.jsx'));
export const TopBar = lazy(() => import('./shell/TopBar.jsx'));
export const DesktopCanvas = lazy(() => import('./desktop/DesktopCanvas.jsx'));
export const DesktopIcon = lazy(() => import('./desktop/DesktopIcon.jsx'));
export const DesktopWidgets = lazy(() => import('./desktop/DesktopWidgets.jsx'));
export const AppStageAdapter = lazy(() => import('./desktop/AppStageAdapter.jsx'));
export const WindowFrame = lazy(() => import('./windows/WindowFrame.jsx'));
export const WindowManagerStage = lazy(() => import('./windows/WindowManagerStage.jsx'));
export const Dock = lazy(() => import('./dock/Dock.jsx'));
export const AppLauncher = lazy(() => import('./launcher/AppLauncher.jsx'));
export const CommandPalette = lazy(() => import('./launcher/CommandPalette.jsx'));
export const FileManager = lazy(() => import('./files/FileManager.jsx'));
export const SystemSettingsApp = lazy(() => import('./settings/SystemSettingsApp.jsx'));
export const ExtensionToolsApp = lazy(() => import('./settings/ExtensionToolsApp.jsx'));
export const MobileShell = lazy(() => import('./mobile/MobileShell.jsx'));

