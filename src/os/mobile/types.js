/**
 * Elyx OS 1.0 — Mobile Architecture Contracts & Types
 * Inspired by iOS App Switcher, Dynamic Island, and Bottom Sheet Navigation
 */

export const MOBILE_PRESENTATION_MODES = Object.freeze({
  BOTTOM_SHEET: 'bottom-sheet',
  FULLSCREEN_PAGE: 'fullscreen-page',
  CARD_DECK: 'card-deck',
});

export const DEFAULT_MOBILE_CONFIG = Object.freeze({
  gestureHandleEnabled: true,
  swipeToDismissThreshold: 120, // px
  bottomBarHeight: 56, // px
  quickSwitcherEnabled: true,
  hapticFeedbackEnabled: true,
});
