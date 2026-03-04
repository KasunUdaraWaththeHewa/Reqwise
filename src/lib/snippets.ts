import type { Request } from '@/store/apiStore';

export function buildCurlSnippet(req: Request, url: string, headers: Record<string, string>, body?: unknown) {
  const headerLines = Object.entries(headers).map(([k, v]) => `-H ${JSON.stringify(`${k}: ${v}`)}`).join(' ');
  const dataLine = body !== undefined ? ` --data ${JSON.stringify(typeof body === 'string' ? body : JSON.stringify(body))}` : '';
  return `curl -X ${req.method} ${JSON.stringify(url)} ${headerLines}${dataLine}`.trim();
}

export function buildPythonSnippet(req: Request, url: string, headers: Record<string, string>, params: Record<string, string>, body?: unknown) {
  return `import requests\n\nresponse = requests.request(\n    ${JSON.stringify(req.method)},\n    ${JSON.stringify(url)},\n    headers=${JSON.stringify(headers, null, 4)},\n    params=${JSON.stringify(params, null, 4)},\n    json=${JSON.stringify(body, null, 4)}\n)\n\nprint(response.status_code)\nprint(response.text)`;
}
