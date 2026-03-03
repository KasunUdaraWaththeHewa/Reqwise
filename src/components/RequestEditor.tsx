import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, Plus, Trash2, Copy, ClipboardPaste, Wand2, XCircle, Gauge } from 'lucide-react';
import { useApiStore, type EnvVariable, type TestAssertion } from '../store/apiStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { httpClient } from '../lib/httpClient';
import { interpolateTemplate, runAssertions, toVariableMap } from '../lib/requestRuntime';
import { runLoadTest } from '../lib/loadTesting';
import { toast } from 'sonner';

function parseKeyValueRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.includes('\t') ? line.split('\t') : line.split(':');
      return {
        key: key?.trim() ?? '',
        value: rest.join(line.includes('\t') ? '\t' : ':').trim(),
        enabled: true,
      };
    })
    .filter((row) => row.key);
}

const testTypeLabel: Record<TestAssertion['type'], string> = {
  statusEquals: 'Status equals',
  responseTimeLessThan: 'Response time < (ms)',
  jsonPathExists: 'JSON path exists',
};

function newEnvVar(): EnvVariable {
  return { id: `env-${Date.now()}-${Math.random()}`, key: '', value: '', enabled: true, secret: false };
}

function newTestAssertion(): TestAssertion {
  return { id: `test-${Date.now()}-${Math.random()}`, type: 'statusEquals', enabled: true, expectedValue: '200' };
}

export function RequestEditor() {
  const {
    activeTab,
    requests,
    collections,
    updateRequest,
    setResponse,
    globalEnvVars,
    workspaceEnvVars,
    collectionEnvVars,
    setGlobalEnvVars,
    setWorkspaceEnvVars,
    setCollectionEnvVars,
  } = useApiStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadTesting, setIsLoadTesting] = useState(false);
  const [isScheduledRunning, setIsScheduledRunning] = useState(false);
  const [scheduledRuns, setScheduledRuns] = useState(0);
  const [scriptCopied, setScriptCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scheduleTimerRef = useRef<number | null>(null);

  const activeRequest = activeTab
    ? requests.find((req) => req.id === activeTab)
    : null;

  const requestEnvVars = useMemo(() => activeRequest?.envVars ?? [], [activeRequest?.envVars]);
  const requestTests = useMemo(() => activeRequest?.tests ?? [], [activeRequest?.tests]);
  const requestSettings = useMemo(() => activeRequest?.settings ?? {
    timeoutMs: 30000,
    loadTest: { iterations: 10, concurrency: 2, delayMs: 0 },
    automation: { enabled: false, intervalMs: 60000, maxRuns: 0, stopOnFailure: false },
  }, [activeRequest?.settings]);

  const activeCollectionId = useMemo(
    () => collections.find((collection) => collection.requests.includes(activeRequest?.id ?? ''))?.id,
    [activeRequest?.id, collections]
  );

  const collectionScopedVars = useMemo(
    () => (activeCollectionId ? (collectionEnvVars[activeCollectionId] ?? []) : []),
    [activeCollectionId, collectionEnvVars]
  );

  const enabledHeadersCount = useMemo(
    () => activeRequest?.headers.filter((h) => h.enabled && h.key).length ?? 0,
    [activeRequest]
  );

  const enabledParamsCount = useMemo(
    () => activeRequest?.queryParams.filter((p) => p.enabled && p.key).length ?? 0,
    [activeRequest]
  );

  const updateField = (field: string, value: unknown) => {
    if (!activeRequest) return;
    updateRequest(activeRequest.id, { [field]: value });
  };

  const interpolate = useCallback((value: string) => {
    const variables = toVariableMap(globalEnvVars, workspaceEnvVars, collectionScopedVars, requestEnvVars);
    return interpolateTemplate(value, variables);
  }, [collectionScopedVars, globalEnvVars, requestEnvVars, workspaceEnvVars]);

  const buildRequestPayload = useCallback(() => {
    if (!activeRequest) return null;

    const headers: Record<string, string> = {};
    activeRequest.headers
      .filter((h) => h.enabled && h.key && h.value)
      .forEach((h) => {
        headers[h.key] = interpolate(h.value);
      });

    const params: Record<string, string> = {};
    activeRequest.queryParams
      .filter((p) => p.enabled && p.key && p.value)
      .forEach((p) => {
        params[p.key] = interpolate(p.value);
      });

    let body: unknown;
    if (activeRequest.body.type === 'json' && activeRequest.body.content) {
      const content = interpolate(activeRequest.body.content);
      try {
        body = JSON.parse(content);
      } catch {
        body = content;
      }
    } else if (activeRequest.body.type === 'text') {
      body = interpolate(activeRequest.body.content);
    }

    return {
      method: activeRequest.method,
      url: interpolate(activeRequest.url),
      headers,
      params,
      body,
      timeoutMs: requestSettings.timeoutMs,
    };
  }, [activeRequest, interpolate, requestSettings.timeoutMs]);

  const handleSendRequest = useCallback(async () => {
    if (!activeRequest) return false;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    try {
      const payload = buildRequestPayload();
      if (!payload) return false;

      const response = await httpClient.request({
        ...payload,
        signal: controller.signal,
      });

      const { results, summary } = runAssertions(response, requestTests);
      setResponse(activeRequest.id, {
        ...response,
        testResults: results,
        testSummary: summary,
      });
      toast.success('Request sent successfully');
      return response.status >= 200 && response.status < 400;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const statusText = typeof error === 'object' && error !== null && 'statusText' in error ? String((error as { statusText?: string }).statusText || 'Network Error') : 'Network Error';
      setResponse(activeRequest.id, {
        status: 0,
        statusText,
        headers: {},
        data: message,
        time: 0,
        size: 0,
      });
      toast.error('Request failed');
      return false;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }

    return false;
  }, [activeRequest, buildRequestPayload, requestTests, setResponse]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeRequest) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSendRequest();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toast.success('Changes are auto-saved locally');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeRequest, handleSendRequest]);

  const addHeader = () => {
    if (!activeRequest) return;
    updateField('headers', [...activeRequest.headers, { key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index: number, field: string, value: unknown) => {
    if (!activeRequest) return;
    const newHeaders = [...activeRequest.headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    updateField('headers', newHeaders);
  };

  const removeHeader = (index: number) => {
    if (!activeRequest) return;
    updateField('headers', activeRequest.headers.filter((_, i) => i !== index));
  };

  const addQueryParam = () => {
    if (!activeRequest) return;
    updateField('queryParams', [...activeRequest.queryParams, { key: '', value: '', enabled: true }]);
  };

  const updateQueryParam = (index: number, field: string, value: unknown) => {
    if (!activeRequest) return;
    const newParams = [...activeRequest.queryParams];
    newParams[index] = { ...newParams[index], [field]: value };
    updateField('queryParams', newParams);
  };

  const removeQueryParam = (index: number) => {
    if (!activeRequest) return;
    updateField('queryParams', activeRequest.queryParams.filter((_, i) => i !== index));
  };

  const pasteRows = async (type: 'headers' | 'queryParams') => {
    if (!activeRequest) return;

    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseKeyValueRows(text);
      if (!parsed.length) {
        toast.error('Clipboard does not contain key/value rows');
        return;
      }

      if (type === 'headers') {
        updateField('headers', [...activeRequest.headers, ...parsed]);
      } else {
        updateField('queryParams', [...activeRequest.queryParams, ...parsed]);
      }

      toast.success(`Added ${parsed.length} ${type === 'headers' ? 'headers' : 'query params'} from clipboard`);
    } catch {
      toast.error('Unable to read clipboard. Browser permissions may be blocked.');
    }
  };

  const copyRows = async (type: 'headers' | 'queryParams') => {
    if (!activeRequest) return;
    const rows = type === 'headers' ? activeRequest.headers : activeRequest.queryParams;
    const text = rows
      .filter((row) => row.key)
      .map((row) => `${row.key}\t${row.value}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type === 'headers' ? 'Headers' : 'Query params'} copied`);
    } catch {
      toast.error('Unable to copy to clipboard.');
    }
  };

  const formatJsonBody = () => {
    if (!activeRequest || activeRequest.body.type !== 'json') return;
    try {
      const parsed = JSON.parse(activeRequest.body.content || '{}');
      updateField('body', { ...activeRequest.body, content: JSON.stringify(parsed, null, 2) });
      toast.success('JSON body formatted');
    } catch {
      toast.error('Invalid JSON body');
    }
  };

  const updateEnvList = (
    scope: 'global' | 'workspace' | 'collection' | 'request',
    next: EnvVariable[]
  ) => {
    if (!activeRequest) return;
    if (scope === 'global') setGlobalEnvVars(next);
    if (scope === 'workspace') setWorkspaceEnvVars(next);
    if (scope === 'collection' && activeCollectionId) setCollectionEnvVars(activeCollectionId, next);
    if (scope === 'request') updateField('envVars', next);
  };

  const addTest = () => {
    if (!activeRequest) return;
    updateField('tests', [...requestTests, newTestAssertion()]);
  };

  const updateTest = (index: number, field: keyof TestAssertion, value: string | boolean) => {
    if (!activeRequest) return;
    const next = [...requestTests];
    next[index] = { ...next[index], [field]: value };
    updateField('tests', next);
  };

  const removeTest = (index: number) => {
    if (!activeRequest) return;
    updateField('tests', requestTests.filter((_, i) => i !== index));
  };



  const generatedScript = useMemo(() => {
    if (!activeRequest) return '';

    const payload = buildRequestPayload();
    if (!payload) return '';

    const body = payload.body === undefined
      ? 'undefined'
      : typeof payload.body === 'string'
        ? JSON.stringify(payload.body)
        : JSON.stringify(payload.body, null, 2);

    return `// Reqwise generated script
// Request: ${activeRequest.name}
const fetch = globalThis.fetch;

const requestConfig = {
  method: '${payload.method}',
  url: ${JSON.stringify(payload.url)},
  headers: ${JSON.stringify(payload.headers, null, 2)},
  params: ${JSON.stringify(payload.params, null, 2)},
  body: ${body},
};

function buildUrl(url, params) {
  const finalUrl = new URL(url);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) {
      finalUrl.searchParams.append(k, String(v));
    }
  });
  return finalUrl.toString();
}

async function runScenario(iterations = 1, delayMs = 0) {
  for (let i = 0; i < iterations; i += 1) {
    const response = await fetch(buildUrl(requestConfig.url, requestConfig.params), {
      method: requestConfig.method,
      headers: requestConfig.headers,
      body: requestConfig.body && ['POST', 'PUT', 'PATCH'].includes(requestConfig.method)
        ? (typeof requestConfig.body === 'string' ? requestConfig.body : JSON.stringify(requestConfig.body))
        : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    console.log('Run', i + 1, 'status=', response.status, 'body=', data);

    if (delayMs > 0 && i < iterations - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

runScenario(
  ${requestSettings.automation?.maxRuns && requestSettings.automation.maxRuns > 0 ? requestSettings.automation.maxRuns : 1},
  ${requestSettings.automation?.intervalMs ?? 60000}
);
`;
  }, [activeRequest, buildRequestPayload, requestSettings.automation?.intervalMs, requestSettings.automation?.maxRuns]);

  const copyGeneratedScript = async () => {
    if (!generatedScript) return;
    try {
      await navigator.clipboard.writeText(generatedScript);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 1500);
      toast.success('Generated script copied');
    } catch {
      toast.error('Unable to copy script');
    }
  };

  const handleRunLoadTest = async () => {
    if (!activeRequest || isLoadTesting) return;

    setIsLoadTesting(true);
    try {
      const summary = await runLoadTest(activeRequest, interpolate);
      const payload = buildRequestPayload();
      if (!payload) return false;

      const latestResponse = await httpClient.request(payload);
      const { results, summary: testSummary } = runAssertions(latestResponse, requestTests);

      setResponse(activeRequest.id, {
        ...latestResponse,
        testResults: results,
        testSummary,
        loadTestSummary: summary,
      });
      toast.success(`Load test completed: ${summary.iterations} requests at concurrency ${summary.concurrency}`);
    } catch {
      toast.error('Load test failed');
    } finally {
      setIsLoadTesting(false);
    }
  };

  const cancelRequest = () => {
    abortControllerRef.current?.abort();
    toast.message('Request cancelled');
  };

  useEffect(() => {
    if (scheduleTimerRef.current) {
      window.clearInterval(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }

    if (!activeRequest || !requestSettings.automation?.enabled) {
      setIsScheduledRunning(false);
      setScheduledRuns(0);
      return;
    }

    const intervalMs = Math.max(1000, requestSettings.automation.intervalMs || 60000);
    const maxRuns = Math.max(0, requestSettings.automation.maxRuns || 0);
    setIsScheduledRunning(true);
    setScheduledRuns(0);

    const run = async () => {
      if (isLoading || isLoadTesting) return;
      const passed = await handleSendRequest();
      if (requestSettings.automation?.stopOnFailure && !passed) {
        if (scheduleTimerRef.current) {
          window.clearInterval(scheduleTimerRef.current);
          scheduleTimerRef.current = null;
        }
        setIsScheduledRunning(false);
        if (activeRequest?.id) {
          updateRequest(activeRequest.id, {
            settings: {
              ...requestSettings,
              automation: { ...requestSettings.automation, enabled: false },
            },
          });
        }
        toast.error('Scheduled automation stopped due to failure');
        return;
      }
      setScheduledRuns((prev) => {
        const next = prev + 1;
        if (maxRuns > 0 && next >= maxRuns) {
          if (scheduleTimerRef.current) {
            window.clearInterval(scheduleTimerRef.current);
            scheduleTimerRef.current = null;
          }
          setIsScheduledRunning(false);
          if (activeRequest?.id) {
            updateRequest(activeRequest.id, {
              settings: {
                ...requestSettings,
                automation: { ...requestSettings.automation, enabled: false },
              },
            });
          }
          toast.message('Scheduled automation completed');
        }
        return next;
      });
    };

    run();
    scheduleTimerRef.current = window.setInterval(run, intervalMs);

    return () => {
      if (scheduleTimerRef.current) {
        window.clearInterval(scheduleTimerRef.current);
        scheduleTimerRef.current = null;
      }
      setIsScheduledRunning(false);
    };
  }, [activeRequest?.id, handleSendRequest, isLoadTesting, isLoading, requestSettings, updateRequest]);

  if (!activeRequest) {
    return <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">No request selected</div>;
  }

  const envSections: { title: string; scope: 'global' | 'workspace' | 'collection' | 'request'; rows: EnvVariable[]; description: string }[] = [
    { title: 'Global', scope: 'global', rows: globalEnvVars, description: 'Shared across all workspaces and requests.' },
    { title: 'Workspace', scope: 'workspace', rows: workspaceEnvVars, description: 'Applies to the current workspace.' },
    { title: 'Collection', scope: 'collection', rows: collectionScopedVars, description: 'Applies to requests in this collection.' },
    { title: 'Request', scope: 'request', rows: requestEnvVars, description: 'Overrides values for this request only.' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-3 border-b border-border bg-card space-y-2 text-xs">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <Input
            placeholder="Request name"
            value={activeRequest.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="max-w-xs font-medium h-8 text-xs"
          />
          <div className="text-[11px] text-muted-foreground">Auto-save • ⌘/Ctrl+Enter Send • ⌘/Ctrl+S Save</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={activeRequest.method} onValueChange={(value) => updateField('method', value)}>
            <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Enter URL"
            value={activeRequest.url}
            onChange={(e) => updateField('url', e.target.value)}
            className="flex-1 min-w-[180px] font-mono text-xs h-8"
          />

          <Input
            type="number"
            min={1000}
            step={500}
            value={requestSettings.timeoutMs}
            onChange={(e) => updateField('settings', { ...requestSettings, timeoutMs: Math.max(1000, Number(e.target.value) || 30000) })}
            className="w-32 text-xs h-8"
            placeholder="Timeout (ms)"
          />

          {isLoading && (
            <Button variant="outline" onClick={cancelRequest}>
              <XCircle className="h-4 w-4 mr-1" />Cancel
            </Button>
          )}

          <Button variant="outline" onClick={handleRunLoadTest} disabled={isLoading || isLoadTesting || !activeRequest.url}>
            {isLoadTesting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-foreground border-t-transparent" /> : <Gauge className="h-4 w-4" />}
            <span className="ml-2">Load Test</span>
          </Button>

          <Button onClick={handleSendRequest} disabled={isLoading || isLoadTesting || !activeRequest.url}>
            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" /> : <Send className="h-4 w-4" />}
            <span className="ml-2">Send</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="params" className="h-full flex flex-col">
          <TabsList className="flex w-full h-auto justify-start gap-1 overflow-x-auto whitespace-nowrap rounded-none border-b border-border bg-muted/70 p-1">
            <TabsTrigger className="shrink-0" value="params">Query Params ({enabledParamsCount})</TabsTrigger>
            <TabsTrigger className="shrink-0" value="headers">Headers ({enabledHeadersCount})</TabsTrigger>
            <TabsTrigger className="shrink-0" value="body">Body</TabsTrigger>
            <TabsTrigger className="shrink-0" value="auth">Auth</TabsTrigger>
            <TabsTrigger className="shrink-0" value="env">Environment</TabsTrigger>
            <TabsTrigger className="shrink-0" value="tests">Tests ({requestTests.length})</TabsTrigger>
            <TabsTrigger className="shrink-0" value="load">Load</TabsTrigger>
            <TabsTrigger className="shrink-0" value="automation">Automation</TabsTrigger>
            <TabsTrigger className="shrink-0" value="script">Script</TabsTrigger>
          </TabsList>

          <TabsContent value="params" className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium">Query Parameters</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyRows('queryParams')}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                <Button size="sm" variant="outline" onClick={() => pasteRows('queryParams')}><ClipboardPaste className="h-4 w-4 mr-1" />Paste</Button>
                <Button size="sm" variant="outline" onClick={addQueryParam}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>

            {activeRequest.queryParams.map((param, index) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <input type="checkbox" checked={param.enabled} onChange={(e) => updateQueryParam(index, 'enabled', e.target.checked)} className="rounded border-input" />
                <Input placeholder="Key" value={param.key} onChange={(e) => updateQueryParam(index, 'key', e.target.value)} className="flex-1 min-w-[180px] font-mono text-xs h-8" />
                <Input placeholder="Value" value={param.value} onChange={(e) => updateQueryParam(index, 'value', e.target.value)} className="flex-1 min-w-[180px] font-mono text-xs h-8" />
                <Button size="sm" variant="ghost" onClick={() => removeQueryParam(index)} className="p-2 hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="headers" className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium">Headers</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyRows('headers')}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                <Button size="sm" variant="outline" onClick={() => pasteRows('headers')}><ClipboardPaste className="h-4 w-4 mr-1" />Paste</Button>
                <Button size="sm" variant="outline" onClick={addHeader}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>

            {activeRequest.headers.map((header, index) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <input type="checkbox" checked={header.enabled} onChange={(e) => updateHeader(index, 'enabled', e.target.checked)} className="rounded border-input" />
                <Input placeholder="Key" value={header.key} onChange={(e) => updateHeader(index, 'key', e.target.value)} className="flex-1 min-w-[180px] font-mono text-xs h-8" />
                <Input placeholder="Value" value={header.value} onChange={(e) => updateHeader(index, 'value', e.target.value)} className="flex-1 min-w-[180px] font-mono text-xs h-8" />
                <Button size="sm" variant="ghost" onClick={() => removeHeader(index)} className="p-2 hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="body" className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            <div className="flex items-center space-x-3">
              <h3 className="text-xs font-medium">Body</h3>
              <Select value={activeRequest.body.type} onValueChange={(value) => updateField('body', { ...activeRequest.body, type: value })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="form">Form Data</SelectItem>
                </SelectContent>
              </Select>
              {activeRequest.body.type === 'json' && (
                <Button size="sm" variant="outline" onClick={formatJsonBody}><Wand2 className="h-4 w-4 mr-1" />Format JSON</Button>
              )}
            </div>

            {activeRequest.body.type !== 'none' && (
              <Textarea
                placeholder={activeRequest.body.type === 'json' ? '{\n  "key": "value"\n}' : 'Enter request body...'}
                value={activeRequest.body.content}
                onChange={(e) => updateField('body', { ...activeRequest.body, content: e.target.value })}
                className="min-h-64 font-mono text-sm"
              />
            )}
          </TabsContent>

          <TabsContent value="auth" className="flex-1 p-4 overflow-y-auto">
            <div className="rounded-md border border-border p-4 bg-card space-y-2 text-sm">
              <p className="font-medium">Auth helper</p>
              <p className="text-muted-foreground">Quickly add common auth headers in the Headers tab:</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateField('headers', [...activeRequest.headers, { key: 'Authorization', value: 'Bearer ', enabled: true }])}>Bearer token</Button>
                <Button size="sm" variant="outline" onClick={() => updateField('headers', [...activeRequest.headers, { key: 'Authorization', value: 'Basic ', enabled: true }])}>Basic auth</Button>
                <Button size="sm" variant="outline" onClick={() => updateField('headers', [...activeRequest.headers, { key: 'X-API-Key', value: '', enabled: true }])}>API key</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="env" className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {envSections.map((section) => (
              <div key={section.scope} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium">{section.title} variables</h3>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => updateEnvList(section.scope, [...section.rows, newEnvVar()])}>
                    <Plus className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
                {section.rows.map((row, index) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-2">
                    <input type="checkbox" checked={row.enabled} onChange={(e) => {
                      const next = [...section.rows];
                      next[index] = { ...next[index], enabled: e.target.checked };
                      updateEnvList(section.scope, next);
                    }} className="rounded border-input" />
                    <Input placeholder="Key" value={row.key} onChange={(e) => {
                      const next = [...section.rows];
                      next[index] = { ...next[index], key: e.target.value };
                      updateEnvList(section.scope, next);
                    }} className="font-mono text-xs min-w-[140px] flex-1" />
                    <Input placeholder="Value" type={row.secret ? 'password' : 'text'} value={row.value} onChange={(e) => {
                      const next = [...section.rows];
                      next[index] = { ...next[index], value: e.target.value };
                      updateEnvList(section.scope, next);
                    }} className="font-mono text-xs min-w-[140px] flex-1" />
                    <label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <input type="checkbox" checked={row.secret} onChange={(e) => {
                        const next = [...section.rows];
                        next[index] = { ...next[index], secret: e.target.checked };
                        updateEnvList(section.scope, next);
                      }} /> secret
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => updateEnvList(section.scope, section.rows.filter((_, i) => i !== index))} className="p-2 hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="tests" className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium">Request tests</h3>
                <p className="text-xs text-muted-foreground">Assertions run after each request and results appear in response + history.</p>
              </div>
              <Button size="sm" variant="outline" onClick={addTest}><Plus className="h-4 w-4 mr-1" />Add test</Button>
            </div>

            {requestTests.length === 0 && (
              <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">No tests configured yet.</div>
            )}

            {requestTests.map((test, index) => (
              <div key={test.id} className="rounded-md border border-border p-2 flex items-center gap-2 flex-wrap">
                <input type="checkbox" checked={test.enabled} onChange={(e) => updateTest(index, 'enabled', e.target.checked)} className="rounded border-input" />
                <Select value={test.type} onValueChange={(value) => updateTest(index, 'type', value)}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="statusEquals">{testTypeLabel.statusEquals}</SelectItem>
                    <SelectItem value="responseTimeLessThan">{testTypeLabel.responseTimeLessThan}</SelectItem>
                    <SelectItem value="jsonPathExists">{testTypeLabel.jsonPathExists}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={test.expectedValue}
                  onChange={(e) => updateTest(index, 'expectedValue', e.target.value)}
                  placeholder={test.type === 'jsonPathExists' ? 'data.user.id' : 'Expected value'}
                  className="font-mono text-xs"
                />
                <Button size="sm" variant="ghost" onClick={() => removeTest(index)} className="p-2 hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="load" className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            <div className="rounded-md border border-border p-4 bg-card space-y-4">
              <div>
                <h3 className="text-xs font-medium">Load testing</h3>
                <p className="text-xs text-muted-foreground">Run repeated requests against this endpoint and capture latency + throughput metrics.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Iterations</label>
                  <Input
                    type="number"
                    min={1}
                    value={requestSettings.loadTest?.iterations ?? 10}
                    onChange={(e) => updateField('settings', {
                      ...requestSettings,
                      loadTest: {
                        ...requestSettings.loadTest,
                        iterations: Math.max(1, Number(e.target.value) || 1),
                      },
                    })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Concurrency</label>
                  <Input
                    type="number"
                    min={1}
                    value={requestSettings.loadTest?.concurrency ?? 2}
                    onChange={(e) => updateField('settings', {
                      ...requestSettings,
                      loadTest: {
                        ...requestSettings.loadTest,
                        concurrency: Math.max(1, Number(e.target.value) || 1),
                      },
                    })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Delay (ms)</label>
                  <Input
                    type="number"
                    min={0}
                    value={requestSettings.loadTest?.delayMs ?? 0}
                    onChange={(e) => updateField('settings', {
                      ...requestSettings,
                      loadTest: {
                        ...requestSettings.loadTest,
                        delayMs: Math.max(0, Number(e.target.value) || 0),
                      },
                    })}
                  />
                </div>
              </div>
              <Button onClick={handleRunLoadTest} disabled={isLoadTesting || isLoading || !activeRequest.url}>
                <Gauge className="h-4 w-4 mr-1" />
                {isLoadTesting ? 'Running load test...' : 'Run load test'}
              </Button>
            </div>
          </TabsContent>


          <TabsContent value="automation" className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            <div className="rounded-md border border-border p-4 bg-card space-y-4">
              <div>
                <h3 className="text-xs font-medium">Scheduled automation</h3>
                <p className="text-xs text-muted-foreground">Run this request repeatedly on a fixed interval for monitoring and regression checks.</p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={requestSettings.automation?.enabled ?? false}
                  onChange={(e) => updateField('settings', {
                    ...requestSettings,
                    automation: {
                      ...requestSettings.automation,
                      enabled: e.target.checked,
                    },
                  })}
                />
                Enable schedule
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Interval (ms)</label>
                  <Input
                    type="number"
                    min={1000}
                    value={requestSettings.automation?.intervalMs ?? 60000}
                    onChange={(e) => updateField('settings', {
                      ...requestSettings,
                      automation: {
                        ...requestSettings.automation,
                        intervalMs: Math.max(1000, Number(e.target.value) || 60000),
                      },
                    })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max runs (0 = unlimited)</label>
                  <Input
                    type="number"
                    min={0}
                    value={requestSettings.automation?.maxRuns ?? 0}
                    onChange={(e) => updateField('settings', {
                      ...requestSettings,
                      automation: {
                        ...requestSettings.automation,
                        maxRuns: Math.max(0, Number(e.target.value) || 0),
                      },
                    })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Stop on first failure</label>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={requestSettings.automation?.stopOnFailure ?? false}
                      onChange={(e) => updateField('settings', {
                        ...requestSettings,
                        automation: {
                          ...requestSettings.automation,
                          stopOnFailure: e.target.checked,
                        },
                      })}
                    />
                    Enabled
                  </label>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Status: {isScheduledRunning ? 'Running' : 'Stopped'} • Executions this session: {scheduledRuns}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="script" className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            <div className="rounded-md border border-border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium">Generated test scenario script</h3>
                  <p className="text-xs text-muted-foreground">Copy and run in Node.js to automate this request flow.</p>
                </div>
                <Button size="sm" variant="outline" onClick={copyGeneratedScript}>
                  <Copy className="h-4 w-4 mr-1" />{scriptCopied ? 'Copied!' : 'Copy script'}
                </Button>
              </div>
              <Textarea value={generatedScript} readOnly className="min-h-[360px] font-mono text-xs" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
