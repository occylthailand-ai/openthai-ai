import { describe, it, expect, afterEach, vi } from 'vitest';
import { deviceProfile, initDisplayAcceleration, prefetchWhenIdle } from '../perf';

const setConn = (c) => { Object.defineProperty(navigator, 'connection', { value: c, configurable: true }); };

afterEach(() => {
  setConn(undefined);
  document.documentElement.removeAttribute('data-perf');
  document.documentElement.removeAttribute('data-savedata');
  vi.restoreAllMocks();
});

describe('perf — display acceleration', () => {
  it('deviceProfile() returns a usable shape with defaults', () => {
    const p = deviceProfile();
    expect(p).toHaveProperty('lite');
    expect(p).toHaveProperty('effectiveType');
    expect(typeof p.dpr).toBe('number');
    expect(p.dpr).toBeGreaterThan(0);
  });

  it('flags lite mode on slow networks', () => {
    setConn({ effectiveType: '2g', saveData: false });
    expect(deviceProfile().lite).toBe(true);
  });

  it('flags lite mode + saveData when Save-Data is on', () => {
    setConn({ effectiveType: '4g', saveData: true });
    const p = deviceProfile();
    expect(p.saveData).toBe(true);
    expect(p.lite).toBe(true);
  });

  it('fast 4g without saveData is NOT lite', () => {
    setConn({ effectiveType: '4g', saveData: false });
    expect(deviceProfile().lite).toBe(false);
  });

  it('initDisplayAcceleration() tags <html> with perf mode + CSS vars', () => {
    setConn({ effectiveType: '2g' });
    initDisplayAcceleration();
    const html = document.documentElement;
    expect(html.dataset.perf).toBe('lite');
    expect(html.style.getPropertyValue('--fx-blur')).toBe('0px');
  });

  it('prefetchWhenIdle() skips prefetch on Save-Data (saves user data)', () => {
    setConn({ effectiveType: '4g', saveData: true });
    const loader = vi.fn();
    prefetchWhenIdle([loader]);
    expect(loader).not.toHaveBeenCalled();
  });
});
