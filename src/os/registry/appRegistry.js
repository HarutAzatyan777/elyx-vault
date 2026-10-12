import React, { lazy } from 'react';
import { APP_CATEGORIES } from './categories.js';

// Lazy-loaded application components for optimal startup performance
const DailyWorkspace = lazy(() => import('../../components/daily-workspace/DailyWorkspace'));
const Notepad = lazy(() => import('../../components/notepad/Notepad'));
const MediaVault = lazy(() => import('../../components/media/MediaVault'));
const MusicVault = lazy(() => import('../../components/music/MusicVault'));
const MinecraftVault = lazy(() => import('../../components/MinecraftVault/MinecraftVault'));
const UserManagement = lazy(() => import('../../components/UserManagement'));
const DeviceList = lazy(() => import('../../components/remote/DeviceList'));
const RemoteTerminal = lazy(() => import('../../components/remote/RemoteTerminal'));
const FileManager = lazy(() => import('../files/FileManager'));
const SystemSettingsApp = lazy(() => import('../settings/SystemSettingsApp'));
const ExtensionToolsApp = lazy(() => import('../settings/ExtensionToolsApp'));

/**
 * App Registry definition with complete metadata for every existing module in Elyx Vault.
 */
export const APP_REGISTRY = [
  {
    id: 'daily_workspace',
    name: 'Daily Workspace',
    shortName: 'Workspace',
    description: 'Launch daily presets, open favorite URLs in 1-click, and track workflow activity.',
    category: APP_CATEGORIES.PRODUCTIVITY.id,
    component: DailyWorkspace,
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: false,
    defaultWindowSize: { width: 1120, height: 780 },
    minWindowSize: { width: 620, height: 460 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      badgeColor: '#6366f1',
    },
  },
  {
    id: 'notepad',
    name: 'Notepad & Knowledge',
    shortName: 'Notepad',
    description: 'Markdown note-taking with AES zero-knowledge encryption, tags, and document templates.',
    category: APP_CATEGORIES.PRODUCTIVITY.id,
    component: Notepad,
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: true,
    defaultWindowSize: { width: 980, height: 680 },
    minWindowSize: { width: 440, height: 380 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: true,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      badgeColor: '#3b82f6',
    },
  },
  {
    id: 'media',
    name: 'Media Vault',
    shortName: 'Photos',
    description: 'Encrypted gallery for photos and videos with lightbox viewer and secure storage.',
    category: APP_CATEGORIES.MULTIMEDIA.id,
    component: MediaVault,
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: true,
    defaultWindowSize: { width: 1160, height: 760 },
    minWindowSize: { width: 560, height: 420 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      badgeColor: '#ec4899',
    },
  },
  {
    id: 'music',
    name: 'Music Vault',
    shortName: 'Music',
    description: 'High-fidelity audio player, playlist manager, and YouTube-to-MP3 cloud importer.',
    category: APP_CATEGORIES.MULTIMEDIA.id,
    component: MusicVault,
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: true,
    defaultWindowSize: { width: 1040, height: 720 },
    minWindowSize: { width: 500, height: 420 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
      badgeColor: '#8b5cf6',
    },
  },
  {
    id: 'general',
    name: 'Encrypted Projects',
    shortName: 'Passwords',
    description: 'AES-256 encrypted credential repository with Chrome Extension autofill support.',
    category: APP_CATEGORIES.SECURITY.id,
    component: null, // Rendered via ProjectsContainer / ProjectCard
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: true,
    defaultWindowSize: { width: 1020, height: 700 },
    minWindowSize: { width: 480, height: 400 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      badgeColor: '#10b981',
    },
  },
  {
    id: 'minecraft',
    name: 'Minecraft Vault',
    shortName: 'Minecraft',
    description: 'Server credentials, server management commands, and environment variable configuration.',
    category: APP_CATEGORIES.SECURITY.id,
    component: MinecraftVault,
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: true,
    defaultWindowSize: { width: 1040, height: 720 },
    minWindowSize: { width: 520, height: 420 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: false,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M5 12h14M12 5l7 7-7 7',
      badgeColor: '#14b8a6',
    },
  },
  {
    id: 'devices',
    name: 'Device Manager',
    shortName: 'Devices',
    description: 'Manage enrolled local agent machines, view security logs, and monitor agent heartbeats.',
    category: APP_CATEGORIES.DEVELOPER.id,
    component: DeviceList,
    permissions: ['owner', 'manager', 'member'],
    requiresMasterPassword: false,
    defaultWindowSize: { width: 940, height: 650 },
    minWindowSize: { width: 480, height: 380 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      badgeColor: '#06b6d4',
    },
  },
  {
    id: 'terminal',
    name: 'Remote Terminal',
    shortName: 'Terminal',
    description: 'Live xterm.js PTY shell connected to your local agent daemon over secure RTDB.',
    category: APP_CATEGORIES.DEVELOPER.id,
    component: RemoteTerminal,
    permissions: ['owner', 'manager'],
    requiresMasterPassword: false,
    defaultWindowSize: { width: 920, height: 600 },
    minWindowSize: { width: 500, height: 360 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      badgeColor: '#22c55e',
    },
  },
  {
    id: 'users',
    name: 'User Management',
    shortName: 'Users',
    description: 'Role-based access control, pending invitation lifecycle, and team privileges.',
    category: APP_CATEGORIES.SYSTEM.id,
    component: UserManagement,
    permissions: ['owner', 'manager'],
    requiresMasterPassword: false,
    defaultWindowSize: { width: 960, height: 720 },
    minWindowSize: { width: 480, height: 440 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: false,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      badgeColor: '#f59e0b',
    },
  },
  {
    id: 'files',
    name: 'Files & Storage',
    shortName: 'Files',
    description: 'Unified OS file manager for encrypted media, documents, music library, and credentials.',
    category: APP_CATEGORIES.SYSTEM.id,
    component: FileManager,
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: false,
    defaultWindowSize: { width: 1040, height: 680 },
    minWindowSize: { width: 560, height: 420 },
    mobileBehavior: 'full-screen',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      badgeColor: '#3b82f6',
    },
  },
  {
    id: 'settings',
    name: 'System Settings',
    shortName: 'Settings',
    description: 'Elyx OS appearance, wallpapers, dock positioning, zero-knowledge lock timer, and flags.',
    category: APP_CATEGORIES.SYSTEM.id,
    component: SystemSettingsApp,
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: false,
    defaultWindowSize: { width: 840, height: 600 },
    minWindowSize: { width: 440, height: 380 },
    mobileBehavior: 'modal-sheet',
    dockPinnedDefault: true,
    launchOnStartup: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      badgeColor: '#64748b',
    },
  },
  {
    id: 'extension',
    name: 'Browser Extension Tools',
    shortName: 'Extension',
    description: 'Elyx Vault Chrome Extension status, download links, and auto-fill bridge diagnostics.',
    category: APP_CATEGORIES.SYSTEM.id,
    component: ExtensionToolsApp,
    permissions: ['owner', 'manager', 'member', 'viewer'],
    requiresMasterPassword: false,
    defaultWindowSize: { width: 720, height: 540 },
    minWindowSize: { width: 420, height: 360 },
    mobileBehavior: 'modal-sheet',
    dockPinnedDefault: false,
    launchOnStartup: false,
    resizable: true,
    maximizable: false,
    minimizable: true,
    supportsMultiInstance: false,
    icon: {
      type: 'svg',
      viewBox: '0 0 24 24',
      path: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
      badgeColor: '#0ea5e9',
    },
  },
];

/**
 * Map of App ID -> App Definition for constant-time lookup.
 */
export const APP_REGISTRY_MAP = new Map(
  APP_REGISTRY.map((app) => [app.id, app])
);

/**
 * Returns an application metadata object by its ID.
 * 
 * @param {string} id 
 * @returns {typeof APP_REGISTRY[0] | undefined}
 */
export const getAppById = (id) => APP_REGISTRY_MAP.get(id);

/**
 * Returns all registered applications.
 * 
 * @returns {typeof APP_REGISTRY}
 */
export const getAllApps = () => APP_REGISTRY;

/**
 * Filters registered apps by category ID.
 * 
 * @param {string} categoryId 
 * @returns {typeof APP_REGISTRY}
 */
export const getAppsByCategory = (categoryId) =>
  APP_REGISTRY.filter((app) => app.category === categoryId);

/**
 * Returns all apps pinned to the Dock by default.
 * 
 * @returns {typeof APP_REGISTRY}
 */
export const getPinnedDockApps = () =>
  APP_REGISTRY.filter((app) => app.dockPinnedDefault);

/**
 * Checks whether a given user role has permission to launch an app.
 * 
 * @param {typeof APP_REGISTRY[0] | string} appOrId 
 * @param {string} userRole 
 * @returns {boolean}
 */
export const canUserLaunchApp = (appOrId, userRole = 'viewer') => {
  const app = typeof appOrId === 'string' ? getAppById(appOrId) : appOrId;
  if (!app) return false;
  if (!app.permissions || app.permissions.length === 0) return true;
  return app.permissions.includes(userRole);
};
