
import React, { useState } from 'react';
import { Send, Plus, Trash2 } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { httpClient } from '../lib/httpClient';
import { cn } from '../lib/utils';

export function RequestEditor() {
  const { activeTab, requests, updateRequest, setResponse } = useApiStore();
  const [isLoading, setIsLoading] = useState(false);

  const activeRequest = activeTab 
    ? requests.find((req) => req.id === activeTab)
    : null;

  if (!activeRequest) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">No request selected</h3>
          <p className="text-muted-foreground">Select a request from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  const handleSendRequest = async () => {
    if (!activeRequest) return;

    setIsLoading(true);
    try {
      // Prepare headers
      const headers: Record<string, string> = {};
      activeRequest.headers
        .filter((h) => h.enabled && h.key && h.value)
        .forEach((h) => {
          headers[h.key] = h.value;
        });

      // Prepare query params
      const params: Record<string, string> = {};
      activeRequest.queryParams
        .filter((p) => p.enabled && p.key && p.value)
        .forEach((p) => {
          params[p.key] = p.value;
        });

      // Prepare body
      let body: any = undefined;
      if (activeRequest.body.type === 'json' && activeRequest.body.content) {
        try {
          body = JSON.parse(activeRequest.body.content);
        } catch (e) {
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
    } catch (error: any) {
      setResponse(activeRequest.id, error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    updateRequest(activeRequest.id, { [field]: value });
  };

  const addHeader = () => {
    const newHeaders = [...activeRequest.headers, { key: '', value: '', enabled: true }];
    updateField('headers', newHeaders);
  };

  const updateHeader = (index: number, field: string, value: any) => {
    const newHeaders = [...activeRequest.headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    updateField('headers', newHeaders);
  };

  const removeHeader = (index: number) => {
    const newHeaders = activeRequest.headers.filter((_, i) => i !== index);
    updateField('headers', newHeaders);
  };

  const addQueryParam = () => {
    const newParams = [...activeRequest.queryParams, { key: '', value: '', enabled: true }];
    updateField('queryParams', newParams);
  };

  const updateQueryParam = (index: number, field: string, value: any) => {
    const newParams = [...activeRequest.queryParams];
    newParams[index] = { ...newParams[index], [field]: value };
    updateField('queryParams', newParams);
  };

  const removeQueryParam = (index: number) => {
    const newParams = activeRequest.queryParams.filter((_, i) => i !== index);
    updateField('queryParams', newParams);
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Request Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-2 mb-3">
          <Input
            placeholder="Request name"
            value={activeRequest.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="max-w-xs font-medium"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Select
            value={activeRequest.method}
            onValueChange={(value) => updateField('method', value)}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
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

          <Button
            onClick={handleSendRequest}
            disabled={isLoading || !activeRequest.url}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2">Send</span>
          </Button>
        </div>
      </div>

      {/* Request Details */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="params" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="params">Query Params</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
          </TabsList>

          <TabsContent value="params" className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Query Parameters</h3>
                <Button size="sm" variant="outline" onClick={addQueryParam}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {activeRequest.queryParams.map((param, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={(e) => updateQueryParam(index, 'enabled', e.target.checked)}
                    className="rounded border-input"
                  />
                  <Input
                    placeholder="Key"
                    value={param.key}
                    onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Input
                    placeholder="Value"
                    value={param.value}
                    onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQueryParam(index)}
                    className="p-2 hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {activeRequest.queryParams.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No query parameters added
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="headers" className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Headers</h3>
                <Button size="sm" variant="outline" onClick={addHeader}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {activeRequest.headers.map((header, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                    className="rounded border-input"
                  />
                  <Input
                    placeholder="Key"
                    value={header.key}
                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Input
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeHeader(index)}
                    className="p-2 hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="body" className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-sm font-medium">Body</h3>
                <Select
                  value={activeRequest.body.type}
                  onValueChange={(value) => updateField('body', { ...activeRequest.body, type: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="form">Form Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeRequest.body.type !== 'none' && (
                <Textarea
                  placeholder={
                    activeRequest.body.type === 'json'
                      ? '{\n  "key": "value"\n}'
                      : 'Enter request body...'
                  }
                  value={activeRequest.body.content}
                  onChange={(e) => updateField('body', { ...activeRequest.body, content: e.target.value })}
                  className="min-h-64 font-mono text-sm"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="auth" className="flex-1 p-4 overflow-y-auto">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Authentication options coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
