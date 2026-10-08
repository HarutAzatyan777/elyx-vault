/**
 * Utility functions for URL validation, protocol sanitization, and security logging in Daily Workspace.
 */

/**
 * Checks if a string is a valid HTTP/HTTPS URL and does not contain unsafe protocols like javascript: or data:
 * @param {string} urlString 
 * @returns {boolean}
 */
export function isValidUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  
  const trimmed = urlString.trim();
  if (!trimmed) return false;

  // Explicitly reject dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes and sanitizes a URL string, prefixing missing http/https protocols.
 * Returns null if the URL is invalid or uses an unsafe scheme.
 * @param {string} urlString 
 * @returns {string|null}
 */
export function sanitizeUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  const trimmed = urlString.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }

  try {
    const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Removes sensitive query parameters (e.g. access_token, password, key, secret)
 * to safely log URLs in recent activity without leaking credentials.
 * @param {string} urlString 
 * @returns {string}
 */
export function sanitizeUrlForLog(urlString) {
  const sanitized = sanitizeUrl(urlString);
  if (!sanitized) return 'Invalid URL';

  try {
    const parsed = new URL(sanitized);
    const sensitiveKeys = [
      'token', 'access_token', 'id_token', 'refresh_token',
      'key', 'apikey', 'api_key', 'secret', 'password', 'pass',
      'auth', 'code', 'session', 'signature'
    ];

    sensitiveKeys.forEach((paramKey) => {
      parsed.searchParams.forEach((_, key) => {
        if (key.toLowerCase().includes(paramKey)) {
          parsed.searchParams.set(key, '[REDACTED]');
        }
      });
    });

    return parsed.href;
  } catch {
    return sanitized;
  }
}

/**
 * Extracts clean domain hostname from a URL for favicon generation or title fallback.
 * @param {string} urlString 
 * @returns {string}
 */
export function extractDomain(urlString) {
  const sanitized = sanitizeUrl(urlString);
  if (!sanitized) return 'website';
  try {
    const parsed = new URL(sanitized);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'website';
  }
}

/**
 * Returns Google Favicon service URL for a domain
 * @param {string} urlString 
 * @returns {string}
 */
export function getFaviconUrl(urlString) {
  const domain = extractDomain(urlString);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}
