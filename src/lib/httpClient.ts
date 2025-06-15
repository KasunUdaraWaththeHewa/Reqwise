
export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  time: number;
  size: number;
}

export const httpClient = {
  async request(options: RequestOptions): Promise<ApiResponse> {
    const startTime = performance.now();
    
    try {
      // Build URL with query parameters
      const url = new URL(options.url);
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value) url.searchParams.append(key, value);
        });
      }

      // Prepare headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Prepare body
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
      });

      const endTime = performance.now();
      const time = Math.round(endTime - startTime);

      // Parse response
      const text = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      // Extract response headers
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
      
      throw {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: error instanceof Error ? error.message : 'Unknown error',
        time,
        size: 0,
      };
    }
  },
};
