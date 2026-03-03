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
