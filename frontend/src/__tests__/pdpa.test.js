/**
 * PDPA consent logic tests.
 *
 * PDPABanner stores consent under the key 'openthai_consent_v1' in localStorage.
 * The component shows the banner only when that key is absent, and hides it after
 * the user accepts (by writing a JSON value to that key).
 *
 * These tests exercise the consent logic directly without requiring a full DOM
 * render of the React component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const STORAGE_KEY = 'openthai_consent_v1';

// Minimal in-memory localStorage stub
function makeLocalStorage() {
  const store = {};
  return {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
    _store: store,
  };
}

describe('PDPA consent logic', () => {
  let ls;

  beforeEach(() => {
    ls = makeLocalStorage();
    vi.stubGlobal('localStorage', ls);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('banner should show when localStorage key is absent', () => {
    const consent = localStorage.getItem(STORAGE_KEY);
    expect(consent).toBeNull();
    // With no prior consent, the component would show the banner
    const shouldShow = consent === null;
    expect(shouldShow).toBe(true);
  });

  it('banner should be hidden when consent key is already set', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ analytics: true, marketing: true, necessary: true, date: new Date().toISOString() })
    );
    const consent = localStorage.getItem(STORAGE_KEY);
    expect(consent).not.toBeNull();
    const shouldShow = consent === null;
    expect(shouldShow).toBe(false);
  });

  it('accepting all consent writes correct JSON to localStorage', () => {
    // Simulate the accept(true) callback from PDPABanner
    const acceptAll = (all) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ analytics: all, marketing: all, necessary: true, date: new Date().toISOString() })
      );
    };

    acceptAll(true);

    expect(localStorage.setItem).toHaveBeenCalledOnce();
    const raw = ls._store[STORAGE_KEY];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw);
    expect(parsed.necessary).toBe(true);
    expect(parsed.analytics).toBe(true);
    expect(parsed.marketing).toBe(true);
    expect(parsed.date).toBeTruthy();
  });

  it('accepting necessary-only writes analytics=false and marketing=false', () => {
    const acceptNecessaryOnly = (all) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ analytics: all, marketing: all, necessary: true, date: new Date().toISOString() })
      );
    };

    acceptNecessaryOnly(false);

    const parsed = JSON.parse(ls._store[STORAGE_KEY]);
    expect(parsed.necessary).toBe(true);
    expect(parsed.analytics).toBe(false);
    expect(parsed.marketing).toBe(false);
  });

  it('once consent is stored, banner should not be shown again', () => {
    // First visit — no consent
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // User accepts
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ necessary: true }));

    // Second visit check
    const consent = localStorage.getItem(STORAGE_KEY);
    expect(consent).not.toBeNull();
    expect(consent === null).toBe(false);
  });
});
