import {
  extractDomain,
  getFaviconUrl,
  isValidUrl,
  sanitizeUrl,
  sanitizeUrlForLog,
} from './workspaceValidation.js';

/**
 * Basic assertion test suite for Daily Workspace URL validation and sanitization.
 */
export function runWorkspaceValidationTests() {
  const results = [];

  const assert = (description, condition) => {
    results.push({ description, success: Boolean(condition) });
  };

  // Test 1: Valid HTTP/HTTPS URLs
  assert('Valid HTTP URL', isValidUrl('http://localhost:5173'));
  assert('Valid HTTPS URL', isValidUrl('https://github.com/my-repo'));
  assert('Valid URL without protocol (auto-fixed in sanitizeUrl)', isValidUrl('console.firebase.google.com'));

  // Test 2: Reject dangerous URL schemes
  assert('Reject javascript: protocol', !isValidUrl('javascript:alert("hacked")'));
  assert('Reject data: protocol', !isValidUrl('data:text/html,<script>alert(1)</script>'));
  assert('Reject file: protocol', !isValidUrl('file:///C:/Windows/System32/cmd.exe'));
  assert('Reject empty string', !isValidUrl(''));
  assert('Reject null/undefined', !isValidUrl(null));

  // Test 3: Sanitize URLs
  assert('Sanitize missing protocol', sanitizeUrl('github.com') === 'https://github.com/');
  assert('Sanitize dangerous protocol returns null', sanitizeUrl('javascript:void(0)') === null);

  // Test 4: Sanitize URLs for activity logs (Redact secrets)
  const sensitiveUrl = 'https://api.example.com/callback?access_token=secret123&user=john&apiKey=xyz987';
  const sanitizedLog = sanitizeUrlForLog(sensitiveUrl);
  assert('Redact access_token in logs', sanitizedLog.includes('access_token=%5BREDACTED%5D') || sanitizedLog.includes('access_token=[REDACTED]'));
  assert('Redact apiKey in logs', sanitizedLog.includes('apiKey=%5BREDACTED%5D') || sanitizedLog.includes('apiKey=[REDACTED]'));
  assert('Preserve safe query params', sanitizedLog.includes('user=john'));

  // Test 5: Domain extraction
  assert('Extract clean domain from URL', extractDomain('https://www.github.com/repo/test') === 'github.com');
  assert('Extract domain from localhost', extractDomain('http://localhost:5173') === 'localhost');

  // Test 6: Favicon URL generation
  assert('Generate Favicon URL', getFaviconUrl('https://github.com').includes('domain=github.com'));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[WorkspaceValidation Tests] Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  return { total: results.length, passed, failed, results };
}

// Auto-run when executed directly
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
  runWorkspaceValidationTests();
}
