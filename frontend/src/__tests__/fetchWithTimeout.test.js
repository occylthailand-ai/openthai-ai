import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resolves when fetch succeeds within timeout', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { fetchWithTimeout } = await import('../apiBase.js');
    const promise = fetchWithTimeout('/api/test');
    const result = await promise;

    expect(result).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('rejects with AbortError when timeout is exceeded', async () => {
    // fetch hangs forever — never resolves
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const err = new DOMException('The operation was aborted.', 'AbortError');
            reject(err);
          });
        });
      })
    );

    const { fetchWithTimeout } = await import('../apiBase.js');
    const promise = fetchWithTimeout('/api/slow', {}, 5000);

    // Advance timers past the timeout
    vi.advanceTimersByTime(5001);

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('passes custom timeoutMs to the abort timer', async () => {
    const abortSpy = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, options) => {
        options.signal.addEventListener('abort', abortSpy);
        return new Promise(() => {}); // never resolves
      })
    );

    const { fetchWithTimeout } = await import('../apiBase.js');
    fetchWithTimeout('/api/custom', {}, 2000);

    // Not aborted yet
    vi.advanceTimersByTime(1999);
    expect(abortSpy).not.toHaveBeenCalled();

    // Now crosses the 2000 ms boundary
    vi.advanceTimersByTime(1);
    expect(abortSpy).toHaveBeenCalledOnce();
  });

  it('passes fetch options alongside the abort signal', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { fetchWithTimeout } = await import('../apiBase.js');
    await fetchWithTimeout('/api/post', { method: 'POST', body: '{}' }, 10000);

    const [calledUrl, calledOpts] = fetch.mock.calls[0];
    expect(calledUrl).toBe('/api/post');
    expect(calledOpts.method).toBe('POST');
    expect(calledOpts.signal).toBeInstanceOf(AbortSignal);
  });
});
