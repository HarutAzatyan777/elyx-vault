/**
 * Elyx OS 1.0 — Application Categories
 */

export const APP_CATEGORIES = Object.freeze({
  PRODUCTIVITY: {
    id: 'productivity',
    label: 'Productivity',
    labelArm: 'Արտադրողականություն',
    icon: 'briefcase',
    order: 1,
    accent: '#6366f1',
  },
  SECURITY: {
    id: 'security',
    label: 'Vault & Security',
    labelArm: 'Անվտանգություն և Պահոց',
    icon: 'shield-lock',
    order: 2,
    accent: '#10b981',
  },
  MULTIMEDIA: {
    id: 'multimedia',
    label: 'Media & Entertainment',
    labelArm: 'Մեդիա և Երաժշտություն',
    icon: 'film',
    order: 3,
    accent: '#ec4899',
  },
  DEVELOPER: {
    id: 'developer',
    label: 'Cloud & Dev Tools',
    labelArm: 'Ամպային և Ծրագրավորման Գործիքներ',
    icon: 'terminal',
    order: 4,
    accent: '#06b6d4',
  },
  SYSTEM: {
    id: 'system',
    label: 'System & Preferences',
    labelArm: 'Համակարգ և Կարգավորումներ',
    icon: 'sliders',
    order: 5,
    accent: '#8b5cf6',
  },
});

export const ALL_CATEGORIES = Object.values(APP_CATEGORIES).sort(
  (a, b) => a.order - b.order
);
