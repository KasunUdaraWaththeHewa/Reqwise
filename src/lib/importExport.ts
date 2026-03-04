import type { Request } from '@/store/apiStore';

interface WorkspaceLike {
  collections: Array<{ id: string; name: string; requests: string[]; isExpanded: boolean }>;
  requests: Request[];
}

const defaultSettings = {
  timeoutMs: 30000,
  loadTest: { iterations: 10, concurrency: 2, delayMs: 0 },
  automation: { enabled: false, intervalMs: 60000, maxRuns: 0, stopOnFailure: false },
};

const defaultAuth = {
  type: 'none' as const,
  token: '',
  username: '',
  password: '',
  apiKeyHeader: 'X-API-Key',
  apiKeyValue: '',
};

export function normalizeRequest(request: Partial<Request>, i: number): Request {
  return {
    id: request.id ?? `import-${Date.now()}-${i}`,
    name: request.name ?? `Imported Request ${i + 1}`,
    method: request.method ?? 'GET',
    url: request.url ?? 'https://',
    headers: request.headers ?? [],
    queryParams: request.queryParams ?? [],
    body: request.body ?? { type: 'none', content: '' },
    auth: request.auth ?? defaultAuth,
    settings: request.settings ?? defaultSettings,
    envVars: request.envVars ?? [],
    tests: request.tests ?? [],
    createdAt: request.createdAt ?? Date.now(),
  };
}

export function parseCurlToRequest(curl: string): Partial<Request> {
  const methodMatch = curl.match(/-X\s+(GET|POST|PUT|PATCH|DELETE)/i);
  const headerMatches = [...curl.matchAll(/-H\s+["']([^:"']+):\s*([^"']+)["']/g)];
  const bodyMatch = curl.match(/--data(?:-raw)?\s+["']([\s\S]*?)["']/i);
  const urlMatch = curl.match(/https?:\/\/[^\s"']+/i);

  return {
    name: 'Imported cURL request',
    method: (methodMatch?.[1]?.toUpperCase() as Request['method']) ?? 'GET',
    url: urlMatch?.[0] ?? 'https://',
    headers: headerMatches.map((m) => ({ key: m[1], value: m[2], enabled: true })),
    queryParams: [],
    body: bodyMatch ? { type: 'text', content: bodyMatch[1] } : { type: 'none', content: '' },
  };
}

export function parsePostmanCollection(input: any): WorkspaceLike | null {
  if (!input?.item || !Array.isArray(input.item)) return null;

  const requests: Request[] = [];
  input.item.forEach((item: any, i: number) => {
    const raw = item?.request;
    if (!raw) return;
    const url = typeof raw.url === 'string' ? raw.url : raw.url?.raw ?? 'https://';
    const headers = (raw.header ?? []).map((h: any) => ({ key: h.key ?? '', value: h.value ?? '', enabled: !h.disabled }));
    requests.push(normalizeRequest({
      name: item.name ?? `Postman Request ${i + 1}`,
      method: (raw.method ?? 'GET').toUpperCase(),
      url,
      headers,
      queryParams: [],
      body: raw.body?.raw ? { type: 'text', content: raw.body.raw } : { type: 'none', content: '' },
    }, i));
  });

  return {
    collections: [{ id: `collection-${Date.now()}`, name: input.info?.name ?? 'Imported Postman', requests: requests.map((r) => r.id), isExpanded: true }],
    requests,
  };
}

export function parseOpenApiSpec(input: any): WorkspaceLike | null {
  if (!input?.paths || typeof input.paths !== 'object') return null;
  const requests: Request[] = [];

  Object.entries(input.paths).forEach(([path, methods], i) => {
    Object.entries(methods as Record<string, any>).forEach(([method, op], j) => {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) return;
      requests.push(normalizeRequest({
        name: op.summary ?? `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase() as Request['method'],
        url: `{{baseUrl}}${path}`,
        headers: [],
        queryParams: [],
        body: { type: 'none', content: '' },
      }, i * 100 + j));
    });
  });

  return {
    collections: [{ id: `collection-${Date.now()}`, name: input.info?.title ?? 'Imported OpenAPI', requests: requests.map((r) => r.id), isExpanded: true }],
    requests,
  };
}
