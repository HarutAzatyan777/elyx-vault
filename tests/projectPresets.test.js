import { describe, it, expect } from 'vitest';
import {
  PROJECT_PRESETS,
  getPresetForService,
} from '../src/constants/projectPresets.js';

describe('projectPresets definitions and service matcher', () => {
  it('contains all requested service presets', () => {
    const ids = PROJECT_PRESETS.map((p) => p.id);
    expect(ids).toContain('google');
    expect(ids).toContain('github');
    expect(ids).toContain('linkedin');
    expect(ids).toContain('instagram');
    expect(ids).toContain('facebook');
    expect(ids).toContain('tiktok');
    expect(ids).toContain('twitter');
    expect(ids).toContain('telegram');
  });

  it('correctly matches service by URL or name', () => {
    const google = getPresetForService('https://accounts.google.com', 'Google Work');
    expect(google).not.toBe(null);
    expect(google.id).toBe('google');

    const github = getPresetForService('https://github.com/login', '');
    expect(github).not.toBe(null);
    expect(github.id).toBe('github');

    const tiktok = getPresetForService('', 'My TikTok Account');
    expect(tiktok).not.toBe(null);
    expect(tiktok.id).toBe('tiktok');

    const instagram = getPresetForService('https://www.instagram.com/accounts/login/', 'Insta');
    expect(instagram).not.toBe(null);
    expect(instagram.id).toBe('instagram');

    const fb = getPresetForService('https://facebook.com/login', '');
    expect(fb).not.toBe(null);
    expect(fb.id).toBe('facebook');

    const unknown = getPresetForService('https://randomservice.example/login', 'Custom Service');
    expect(unknown).toBe(null);
  });
});
