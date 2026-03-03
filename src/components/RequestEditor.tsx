import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, Plus, Trash2, Copy, ClipboardPaste, Wand2 } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { httpClient } from '../lib/httpClient';
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

export function RequestEditor() {
  const { activeTab, requests, updateRequest, setResponse } = useApiStore();
  const [isLoading, setIsLoading] = useState(false);

  const activeRequest = activeTab
    ? requests.find((req) => req.id === activeTab)
    : null;

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

  const handleSendRequest = useCallback(async () => {
    if (!activeRequest) return;

    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      activeRequest.headers
        .filter((h) => h.enabled && h.key && h.value)
        .forEach((h) => {
          headers[h.key] = h.value;
        });

      const params: Record<string, string> = {};
      activeRequest.queryParams
        .filter((p) => p.enabled && p.key && p.value)
        .forEach((p) => {
          params[p.key] = p.value;
        });

      let body: unknown;
      if (activeRequest.body.type === 'json' && activeRequest.body.content) {
        try {
          body = JSON.parse(activeRequest.body.content);
        } catch {
          body = activeRequest.body.content;
        }
      } else if (activeRequest.body.type === 'text') {
        body = activeRequest.body.content;
      }

      const response = await httpClient.request({
        method: activeRequest.method,
        url: activeRequest.url,
        headers,
        params,
        body,
      });

      setResponse(activeRequest.id, response);
      toast.success('Request sent successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setResponse(activeRequest.id, {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: message,
        time: 0,
        size: 0,
      });
      toast.error('Request failed');
    } finally {
      setIsLoading(false);
    }
  }, [activeRequest, setResponse]);

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

  if (!activeRequest) {
    return <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">No request selected</div>;
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-4 border-b border-border bg-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Input
            placeholder="Request name"
            value={activeRequest.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="max-w-xs font-medium"
          />
          <div className="text-xs text-muted-foreground">Auto-save enabled • ⌘/Ctrl+Enter Send • ⌘/Ctrl+S Save</div>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={activeRequest.method} onValueChange={(value) => updateField('method', value)}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
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
            className="flex-1 font-mono text-sm"
          />

          <Button onClick={handleSendRequest} disabled={isLoading || !activeRequest.url}>
            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" /> : <Send className="h-4 w-4" />}
            <span className="ml-2">Send</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="params" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="params">Query Params ({enabledParamsCount})</TabsTrigger>
            <TabsTrigger value="headers">Headers ({enabledHeadersCount})</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
          </TabsList>

          <TabsContent value="params" className="flex-1 p-4 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Query Parameters</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyRows('queryParams')}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                <Button size="sm" variant="outline" onClick={() => pasteRows('queryParams')}><ClipboardPaste className="h-4 w-4 mr-1" />Paste</Button>
                <Button size="sm" variant="outline" onClick={addQueryParam}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>

            {activeRequest.queryParams.map((param, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="checkbox" checked={param.enabled} onChange={(e) => updateQueryParam(index, 'enabled', e.target.checked)} className="rounded border-input" />
                <Input placeholder="Key" value={param.key} onChange={(e) => updateQueryParam(index, 'key', e.target.value)} className="flex-1 font-mono text-sm" />
                <Input placeholder="Value" value={param.value} onChange={(e) => updateQueryParam(index, 'value', e.target.value)} className="flex-1 font-mono text-sm" />
                <Button size="sm" variant="ghost" onClick={() => removeQueryParam(index)} className="p-2 hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="headers" className="flex-1 p-4 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Headers</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyRows('headers')}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                <Button size="sm" variant="outline" onClick={() => pasteRows('headers')}><ClipboardPaste className="h-4 w-4 mr-1" />Paste</Button>
                <Button size="sm" variant="outline" onClick={addHeader}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>

            {activeRequest.headers.map((header, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="checkbox" checked={header.enabled} onChange={(e) => updateHeader(index, 'enabled', e.target.checked)} className="rounded border-input" />
                <Input placeholder="Key" value={header.key} onChange={(e) => updateHeader(index, 'key', e.target.value)} className="flex-1 font-mono text-sm" />
                <Input placeholder="Value" value={header.value} onChange={(e) => updateHeader(index, 'value', e.target.value)} className="flex-1 font-mono text-sm" />
                <Button size="sm" variant="ghost" onClick={() => removeHeader(index)} className="p-2 hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="body" className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-medium">Body</h3>
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
        </Tabs>
      </div>
    </div>
  );
}
