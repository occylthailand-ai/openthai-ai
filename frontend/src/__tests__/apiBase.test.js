import { describe, it, expect, vi, afterEach } from 'vitest';

describe('apiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses relative path when VITE_API_URL is unset', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.resetModules();
    const { apiUrl } = await import('../apiBase.js');
    expect(apiUrl('/api/health')).toBe('/api/health');
  });

  it('prefixes origin and strips trailing slash on base', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    vi.resetModules();
    const { apiUrl } = await import('../apiBase.js');
    expect(apiUrl('/api/health')).toBe('https://api.example.com/api/health');
  });

  it('normalizes path without leading slash', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.resetModules();
    const { apiUrl } = await import('../apiBase.js');
    expect(apiUrl('api/health')).toBe('https://api.example.com/api/health');
  });
});
