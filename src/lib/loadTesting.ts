import { httpClient } from './httpClient';
import type { LoadTestResult, LoadTestSummary, Request } from '@/store/apiStore';

interface BuildRequestOptionsArgs {
  request: Request;
  interpolate: (value: string) => string;
}

function buildRequestOptions({ request, interpolate }: BuildRequestOptionsArgs) {
  const headers: Record<string, string> = {};
  request.headers
    .filter((header) => header.enabled && header.key && header.value)
    .forEach((header) => {
      headers[header.key] = interpolate(header.value);
    });

  const params: Record<string, string> = {};
  request.queryParams
    .filter((param) => param.enabled && param.key && param.value)
    .forEach((param) => {
      params[param.key] = interpolate(param.value);
    });

  let body: unknown;
  if (request.body.type === 'json' && request.body.content) {
    const content = interpolate(request.body.content);
    try {
      body = JSON.parse(content);
    } catch {
      body = content;
    }
  } else if (request.body.type === 'text') {
    body = interpolate(request.body.content);
  }

  return {
    method: request.method,
    url: interpolate(request.url),
    headers,
    params,
    body,
    timeoutMs: request.settings.timeoutMs,
  } as const;
}

function quantile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor((sortedValues.length - 1) * percentile);
  return sortedValues[index] ?? 0;
}

export async function runLoadTest(request: Request, interpolate: (value: string) => string): Promise<LoadTestSummary> {
  const iterations = Math.max(1, request.settings.loadTest?.iterations ?? 10);
  const concurrency = Math.max(1, Math.min(iterations, request.settings.loadTest?.concurrency ?? 1));
  const delayMs = Math.max(0, request.settings.loadTest?.delayMs ?? 0);
  const startTime = performance.now();

  const requestOptions = buildRequestOptions({ request, interpolate });

  const results: LoadTestResult[] = [];
  let nextIteration = 1;

  const worker = async () => {
    while (true) {
      const currentIteration = nextIteration;
      nextIteration += 1;

      if (currentIteration > iterations) break;

      if (delayMs > 0 && currentIteration > 1) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }

      try {
        const response = await httpClient.request(requestOptions);
        results.push({
          iteration: currentIteration,
          status: response.status,
          time: response.time,
          size: response.size,
        });
      } catch (error) {
        const response = error as { status?: number; time?: number; size?: number; data?: unknown; statusText?: string };
        results.push({
          iteration: currentIteration,
          status: response.status ?? 0,
          time: response.time ?? 0,
          size: response.size ?? 0,
          error: typeof response.data === 'string' ? response.data : response.statusText ?? 'Request failed',
        });
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const sortedResults = [...results].sort((a, b) => a.iteration - b.iteration);
  const times = sortedResults.map((result) => result.time).sort((a, b) => a - b);
  const failedRequests = sortedResults.filter((result) => Boolean(result.error) || result.status === 0 || result.status >= 400).length;
  const successfulRequests = sortedResults.length - failedRequests;
  const totalDurationMs = Math.max(1, Math.round(performance.now() - startTime));

  return {
    iterations,
    concurrency,
    delayMs,
    totalDurationMs,
    requestsPerSecond: Number(((sortedResults.length / totalDurationMs) * 1000).toFixed(2)),
    successfulRequests,
    failedRequests,
    minResponseTimeMs: times[0] ?? 0,
    maxResponseTimeMs: times[times.length - 1] ?? 0,
    avgResponseTimeMs: Number((times.reduce((sum, value) => sum + value, 0) / (times.length || 1)).toFixed(2)),
    p50ResponseTimeMs: quantile(times, 0.5),
    p95ResponseTimeMs: quantile(times, 0.95),
    p99ResponseTimeMs: quantile(times, 0.99),
    results: sortedResults,
  };
}
