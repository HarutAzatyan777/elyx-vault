/**
 * Quick project URL presets / service templates.
 * Allows 1-click filling of popular web service login URLs and project names.
 */

export const PROJECT_PRESETS = [
  {
    id: 'google',
    name: 'Google',
    url: 'https://accounts.google.com',
    icon: '🌐',
    badge: 'G',
    color: '#4285F4',
    bg: 'rgba(66, 133, 244, 0.15)',
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/login',
    icon: '🐙',
    badge: 'GH',
    color: '#f0f6fc',
    bg: 'rgba(255, 255, 255, 0.12)',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/login',
    icon: '💼',
    badge: 'in',
    color: '#0A66C2',
    bg: 'rgba(10, 102, 194, 0.18)',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://www.instagram.com/accounts/login/',
    icon: '📸',
    badge: 'IG',
    color: '#E1306C',
    bg: 'rgba(225, 48, 108, 0.18)',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    url: 'https://www.facebook.com/login/',
    icon: '👥',
    badge: 'f',
    color: '#1877F2',
    bg: 'rgba(24, 119, 242, 0.18)',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    url: 'https://www.tiktok.com/login',
    icon: '🎵',
    badge: 'TT',
    color: '#EE1D52',
    bg: 'rgba(238, 29, 82, 0.18)',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    url: 'https://x.com/i/flow/login',
    icon: '🐦',
    badge: '𝕏',
    color: '#1DA1F2',
    bg: 'rgba(29, 161, 242, 0.18)',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    url: 'https://web.telegram.org',
    icon: '✈️',
    badge: 'TG',
    color: '#229ED9',
    bg: 'rgba(34, 158, 217, 0.18)',
  },
  {
    id: 'discord',
    name: 'Discord',
    url: 'https://discord.com/login',
    icon: '💬',
    badge: 'DC',
    color: '#5865F2',
    bg: 'rgba(88, 101, 242, 0.18)',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    url: 'https://login.live.com',
    icon: '🪟',
    badge: 'MS',
    color: '#00A4EF',
    bg: 'rgba(0, 164, 239, 0.18)',
  },
];

/**
 * Returns matching preset if the URL or project name matches a known service.
 * @param {string} url
 * @param {string} name
 * @returns {object|null}
 */
export function getPresetForService(url = '', name = '') {
  const text = `${url} ${name}`.toLowerCase();
  for (const preset of PROJECT_PRESETS) {
    if (text.includes(preset.id)) return preset;
    try {
      if (preset.url) {
        const host = new URL(preset.url).hostname.replace(/^www\./, '');
        if (text.includes(host)) return preset;
      }
    } catch {}
  }
  return null;
}
