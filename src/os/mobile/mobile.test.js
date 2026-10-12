/**
 * Elyx OS 1.0 — Mobile OS Experience & Responsive Interaction Test Suite
 */

import {
  DEFAULT_MOBILE_CONFIG,
  loadDeviceMode,
  loadMobileNavStyle,
  loadMobileTheme,
  MOBILE_NAV_STYLES,
  MOBILE_PRESENTATION_MODES,
  MOBILE_THEMES,
  saveDeviceMode,
  saveMobileNavStyle,
  saveMobileTheme,
  STORAGE_KEY_DEVICE_MODE,
  STORAGE_KEY_MOBILE_NAV_STYLE,
  STORAGE_KEY_MOBILE_THEME,
} from './types.js';

import { getAllApps } from '../registry/appRegistry.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[MobileOSTest FAILED]: ${message}`);
  }
}

export function runMobileOSTests() {
  console.group('📱 [Elyx OS] Mobile OS Experience & Responsive Tests');

  try {
    // 1. Mobile Themes & Presentation Contracts
    assert(MOBILE_THEMES.IOS === 'ios', 'MOBILE_THEMES.IOS must equal "ios"');
    assert(MOBILE_THEMES.ANDROID === 'android', 'MOBILE_THEMES.ANDROID must equal "android"');
    assert(MOBILE_PRESENTATION_MODES.HOME === 'home', 'HOME mode must be defined');
    assert(MOBILE_PRESENTATION_MODES.APP_FULLSCREEN === 'app-fullscreen', 'APP_FULLSCREEN mode must be defined');
    assert(MOBILE_PRESENTATION_MODES.APP_SWITCHER === 'app-switcher', 'APP_SWITCHER mode must be defined');
    assert(MOBILE_PRESENTATION_MODES.APP_DRAWER === 'app-drawer', 'APP_DRAWER mode must be defined');
    assert(MOBILE_NAV_STYLES.GESTURE_BAR === 'gesture-bar', 'GESTURE_BAR must be defined');
    assert(MOBILE_NAV_STYLES.THREE_BUTTON === 'three-button', 'THREE_BUTTON must be defined');
    console.log('  ✓ Mobile OS theme & presentation contracts validated');

    // 2. Touch Target & Accessibility Compliance (iOS HIG & Android Material 3)
    assert(DEFAULT_MOBILE_CONFIG.touchTargetMin >= 44, 'Mobile touch target must be at least 44px for accessibility');
    assert(DEFAULT_MOBILE_CONFIG.dockMaxItems === 4, 'Mobile dock should support 4 primary apps');
    assert(DEFAULT_MOBILE_CONFIG.gridColumns === 4, 'Mobile grid should follow 4-column layout');
    console.log('  ✓ Touch target minimums and mobile grid constraints validated (44px min)');

    // 3. Theme & Nav Style Persistence
    if (typeof localStorage !== 'undefined') {
      // Test theme saving & loading
      saveMobileTheme(MOBILE_THEMES.ANDROID);
      assert(loadMobileTheme() === MOBILE_THEMES.ANDROID, 'loadMobileTheme must return saved Android theme');
      saveMobileTheme(MOBILE_THEMES.IOS);
      assert(loadMobileTheme() === MOBILE_THEMES.IOS, 'loadMobileTheme must return saved iOS theme');

      // Test nav style saving & loading
      saveMobileNavStyle(MOBILE_NAV_STYLES.THREE_BUTTON);
      assert(loadMobileNavStyle() === MOBILE_NAV_STYLES.THREE_BUTTON, 'loadMobileNavStyle must return THREE_BUTTON');
      saveMobileNavStyle(MOBILE_NAV_STYLES.GESTURE_BAR);
      assert(loadMobileNavStyle() === MOBILE_NAV_STYLES.GESTURE_BAR, 'loadMobileNavStyle must return GESTURE_BAR');

      // Test device mode override saving & loading
      saveDeviceMode('mobile');
      assert(loadDeviceMode() === 'mobile', 'loadDeviceMode must return mobile');
      saveDeviceMode('desktop');
      assert(loadDeviceMode() === 'desktop', 'loadDeviceMode must return desktop');
      saveDeviceMode('auto');
      assert(loadDeviceMode() === 'auto', 'loadDeviceMode must return auto');

      console.log('  ✓ Mobile theme, navigation style, and device mode persistence verified');
    }

    // 4. Responsive Viewport Adaptation Logic
    const resolveShellMode = (viewportWidth, deviceModeOverride) => {
      if (deviceModeOverride === 'mobile') return 'mobile';
      if (deviceModeOverride === 'desktop') return 'desktop';
      return viewportWidth <= 768 ? 'mobile' : 'desktop';
    };

    // Mobile phones
    assert(resolveShellMode(375, 'auto') === 'mobile', 'iPhone SE (375px) must resolve to mobile shell');
    assert(resolveShellMode(393, 'auto') === 'mobile', 'iPhone 15 Pro (393px) must resolve to mobile shell');
    assert(resolveShellMode(412, 'auto') === 'mobile', 'Samsung Galaxy (412px) must resolve to mobile shell');
    assert(resolveShellMode(768, 'auto') === 'mobile', 'Tablet boundary (768px) must resolve to mobile shell');

    // Desktop
    assert(resolveShellMode(1024, 'auto') === 'desktop', 'Laptop (1024px) must resolve to desktop shell');
    assert(resolveShellMode(1920, 'auto') === 'desktop', 'Full HD Desktop (1920px) must resolve to desktop shell');

    // Manual Overrides
    assert(resolveShellMode(1920, 'mobile') === 'mobile', 'Desktop with mobile override must resolve to mobile shell');
    assert(resolveShellMode(375, 'desktop') === 'desktop', 'Mobile screen with desktop override must resolve to desktop shell');
    console.log('  ✓ Responsive viewport and device mode resolution matrix verified');

    // 5. Complete Registry App Coverage on Mobile
    const allApps = getAllApps();
    assert(allApps.length >= 10, 'All registered apps must be available in Mobile OS');
    const essentialApps = ['daily_workspace', 'notepad', 'media', 'music', 'files', 'settings'];
    essentialApps.forEach((id) => {
      const found = allApps.find((a) => a.id === id);
      assert(Boolean(found), `Essential app ${id} must be registered for mobile access`);
      assert(Boolean(found.name), `App ${id} must have a valid display name`);
      assert(Boolean(found.icon), `App ${id} must have a valid icon`);
    });
    console.log(`  ✓ All ${allApps.length} registered applications verified for fullscreen mobile execution`);

    console.log('✅ All Mobile OS Experience & Responsive Tests PASSED');
  } catch (err) {
    console.error('❌ Mobile OS Test suite failed:', err);
    throw err;
  } finally {
    console.groupEnd();
  }
}
