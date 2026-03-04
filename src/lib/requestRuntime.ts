import type { EnvVariable, Response, TestAssertion, TestResult } from '../store/apiStore';

export function interpolateTemplate(value: string, variables: Record<string, string>) {
  return value.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => variables[key] ?? '');
}

export function toVariableMap(...scopes: EnvVariable[][]): Record<string, string> {
  return scopes.reduce<Record<string, string>>((acc, scope) => {
    scope
      .filter((variable) => variable.enabled && variable.key)
      .forEach((variable) => {
        acc[variable.key] = variable.value;
      });
    return acc;
  }, {});
}

function getJsonPathValue(source: unknown, path: string): unknown {
  if (!path.trim()) return undefined;

  return path
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<unknown>((value, segment) => {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }

      return (value as Record<string, unknown>)[segment];
    }, source);
}

export function runAssertions(response: Response, tests: TestAssertion[]): { results: TestResult[]; summary: { passed: number; failed: number } } {
  const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  const results = tests
    .filter((test) => test.enabled)
    .map<TestResult>((test) => {
      if (test.type === 'statusEquals') {
        const expected = Number(test.expectedValue);
        const passed = Number.isFinite(expected) && response.status === expected;
        return {
          id: test.id,
          type: test.type,
          passed,
          message: passed
            ? `Status is ${response.status}`
            : `Expected status ${test.expectedValue || 'N/A'}, got ${response.status}`,
        };
      }

      if (test.type === 'responseTimeLessThan') {
        const expected = Number(test.expectedValue);
        const passed = Number.isFinite(expected) && response.time < expected;
        return {
          id: test.id,
          type: test.type,
          passed,
          message: passed
            ? `Response time ${response.time}ms < ${expected}ms`
            : `Expected response time < ${test.expectedValue || 'N/A'}ms, got ${response.time}ms`,
        };
      }

      if (test.type === 'bodyContains') {
        const passed = responseText.toLowerCase().includes((test.expectedValue || '').toLowerCase());
        return {
          id: test.id,
          type: test.type,
          passed,
          message: passed
            ? `Body contains '${test.expectedValue}'`
            : `Body does not contain '${test.expectedValue || '(empty)'}'`,
        };
      }

      if (test.type === 'bodyMatchesRegex') {
        try {
          const regex = new RegExp(test.expectedValue);
          const passed = regex.test(responseText);
          return {
            id: test.id,
            type: test.type,
            passed,
            message: passed ? `Body matches /${test.expectedValue}/` : `Body does not match /${test.expectedValue}/`,
          };
        } catch {
          return {
            id: test.id,
            type: test.type,
            passed: false,
            message: `Invalid regex: ${test.expectedValue}`,
          };
        }
      }

      if (test.type === 'headerEquals') {
        const [headerName, expected] = test.expectedValue.split('=').map((part) => part?.trim());
        const actual = headerName ? response.headers[headerName.toLowerCase()] ?? response.headers[headerName] : undefined;
        const passed = Boolean(headerName) && actual === (expected ?? '');
        return {
          id: test.id,
          type: test.type,
          passed,
          message: passed
            ? `Header ${headerName} equals '${expected ?? ''}'`
            : `Expected header in format Header=Value and exact match`,
        };
      }

      if (test.type === 'jsonPathEquals') {
        const [path, expected] = test.expectedValue.split('=').map((part) => part?.trim());
        const value = getJsonPathValue(response.data, path ?? '');
        const passed = String(value) === (expected ?? '');
        return {
          id: test.id,
          type: test.type,
          passed,
          message: passed
            ? `Path '${path}' equals '${expected}'`
            : `Expected ${path || '(empty path)'}=${expected ?? ''}, got ${String(value)}`,
        };
      }

      const value = getJsonPathValue(response.data, test.expectedValue);
      const passed = value !== undefined;
      return {
        id: test.id,
        type: test.type,
        passed,
        message: passed
          ? `Path '${test.expectedValue}' exists`
          : `Path '${test.expectedValue || '(empty)'}' not found`,
      };
    });

  const summary = {
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
  };

  return { results, summary };
}
