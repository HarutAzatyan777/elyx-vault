import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveStoredMasterPassword,
  getStoredMasterPassword,
  clearStoredMasterPassword,
  isMasterPasswordSaved,
  getRememberPreference,
  setRememberPreference,
} from '../src/utils/vaultAuth.js';

describe('vaultAuth master password persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('correctly persists and retrieves master password', () => {
    expect(getStoredMasterPassword()).toBe(null);
    expect(isMasterPasswordSaved()).toBe(false);

    saveStoredMasterPassword('SecretPass123!');
    expect(isMasterPasswordSaved()).toBe(true);
    expect(getStoredMasterPassword()).toBe('SecretPass123!');
  });

  it('handles Unicode and Armenian characters in password correctly', () => {
    const armenianPass = 'ԻմԳաղտնաբառը#2026';
    saveStoredMasterPassword(armenianPass);
    expect(getStoredMasterPassword()).toBe(armenianPass);
  });

  it('clears stored password when requested', () => {
    saveStoredMasterPassword('temporaryPass');
    expect(isMasterPasswordSaved()).toBe(true);

    clearStoredMasterPassword();
    expect(getStoredMasterPassword()).toBe(null);
    expect(isMasterPasswordSaved()).toBe(false);
  });

  it('respects remember preference setting', () => {
    expect(getRememberPreference()).toBe(true);

    setRememberPreference(false);
    expect(getRememberPreference()).toBe(false);

    setRememberPreference(true);
    expect(getRememberPreference()).toBe(true);
  });

  it('safely handles empty or corrupt storage inputs', () => {
    saveStoredMasterPassword('');
    expect(getStoredMasterPassword()).toBe(null);

    localStorage.setItem('elyx_vault_saved_master_pass', 'not-valid-base64-%%%');
    expect(getStoredMasterPassword()).toBe(null);
  });
});
