export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  time: number;
  size: number;
}

function mergeSignals(signal?: AbortSignal, timeoutMs?: number): AbortSignal | undefined {
  if (!timeoutMs || timeoutMs <= 0) return signal;

  const timeoutController = new AbortController();
  const timer = window.setTimeout(() => timeoutController.abort(), timeoutMs);

  if (!signal) {
    timeoutController.signal.addEventListener('abort', () => window.clearTimeout(timer), { once: true });
    return timeoutController.signal;
  }

  const combined = new AbortController();
  const abortCombined = () => combined.abort();

  signal.addEventListener('abort', abortCombined, { once: true });
  timeoutController.signal.addEventListener('abort', abortCombined, { once: true });
  combined.signal.addEventListener(
    'abort',
    () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', abortCombined);
      timeoutController.signal.removeEventListener('abort', abortCombined);
    },
    { once: true }
  );

  return combined.signal;
}

export const httpClient = {
  async request(options: RequestOptions): Promise<ApiResponse> {
    const startTime = performance.now();

    try {
      const url = new URL(options.url);
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value) url.searchParams.append(key, value);
        });
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      let body: string | undefined;
      if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
        body = typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
      }

      const response = await fetch(url.toString(), {
        method: options.method,
        headers,
        body,
        signal: mergeSignals(options.signal, options.timeoutMs),
      });

      const endTime = performance.now();
      const time = Math.round(endTime - startTime);

      const text = await response.text();
      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data,
        time,
        size: new Blob([text]).size,
      };
    } catch (error) {
      const endTime = performance.now();
      const time = Math.round(endTime - startTime);

      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      throw {
        status: 0,
        statusText: isAbortError ? 'Cancelled' : 'Network Error',
        headers: {},
        data: isAbortError ? 'Request was cancelled or timed out.' : error instanceof Error ? error.message : 'Unknown error',
        time,
        size: 0,
      };
    }
  },
};
