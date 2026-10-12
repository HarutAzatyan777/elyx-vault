/**
 * Elyx OS 1.0 — Desktop Shell Architectural Specification
 * 
 * Shell Layer Components:
 * - Desktop Surface & Canvas (Wallpaper, Context Menus, Icon Grid)
 * - Top Navigation & Status Bar (macOS Menubar / GNOME Top Bar)
 * - Window Manager & Window Frame Stage (Windows 11 Snap / Glass Acrylic)
 * - Interactive Dock (macOS Magnified Floating Dock)
 * - System Launcher (Spotlight / GNOME Overview)
 * - Mobile Interaction Drawer (iOS Sheets)
 * - Notification Center & Toast Daemon
 */

export const SHELL_COMPONENTS = Object.freeze({
  TOP_BAR: 'TopBar',
  DESKTOP_SURFACE: 'DesktopSurface',
  WINDOW_MANAGER_STAGE: 'WindowManagerStage',
  DOCK: 'Dock',
  LAUNCHER: 'Launcher',
  MOBILE_DRAWER: 'MobileDrawer',
  NOTIFICATIONS_HOST: 'NotificationsHost',
});
