import { validateDirectoryPath } from '../../agent/src/security/pathValidator.js';
import { verifySessionToken, generateSessionToken } from '../../agent/src/auth/tokenVerifier.js';

/**
 * Basic assertion test suite for Remote Terminal & Local Agent Security logic.
 */
export function runRemoteTerminalTests() {
  const results = [];

  const assert = (description, condition) => {
    results.push({ description, success: Boolean(condition) });
  };

  // Test 1: JWT Session Token Verification
  const testSecret = 'test-secret-key-32-chars-long-abc';
  const token = generateSessionToken({ uid: 'user_123', deviceId: 'dev_456' }, testSecret, '1h');
  const verified = verifySessionToken(token, testSecret);

  assert('Valid JWT token verifies successfully', verified.valid);
  assert('Token payload contains UID', verified.payload?.uid === 'user_123');
  assert('Token payload contains Device ID', verified.payload?.deviceId === 'dev_456');

  const tamperedVerified = verifySessionToken(token + 'tamper', testSecret);
  assert('Tampered token is rejected', !tamperedVerified.valid);

  // Test 2: Path Validation & Canonicalization
  const allowedDirs = [process.cwd()];
  const pathCheck = validateDirectoryPath(process.cwd(), allowedDirs);
  assert('Allowed directory path validation passes', pathCheck.valid);

  const invalidPathCheck = validateDirectoryPath('C:\\Windows\\System32\\config', allowedDirs);
  assert('Unauthorized directory path is rejected', !invalidPathCheck.valid);

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[RemoteTerminal Tests] Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  return { total: results.length, passed, failed, results };
}

// Auto-run when in test environment
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
  runRemoteTerminalTests();
}
