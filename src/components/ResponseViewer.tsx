import React, { useState } from 'react';
import { Copy, Download, Clock3, Trash2 } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { prettifyJson, getStatusColor } from '../lib/utils';
import { cn } from '../lib/utils';

export function ResponseViewer() {
  const { activeTab, responses, requestHistory, clearHistory } = useApiStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const response = activeTab ? responses[activeTab] : null;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  };

  if (!response) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background border-t border-border">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">No response yet</h3>
          <p className="text-muted-foreground">Send a request to see the response</p>
        </div>
      </div>
    );
  }

  const responseText = typeof response.data === 'string' ? response.data : prettifyJson(response.data);
  const headerText = Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join('\n');

  const downloadResponse = () => {
    const blob = new Blob([responseText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col bg-background border-t border-border">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Status:</span>
              <span className={cn('text-sm font-semibold', getStatusColor(response.status))}>{response.status} {response.statusText}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Time:</span>
              <span className="text-sm text-muted-foreground">{response.time}ms</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Size:</span>
              <span className="text-sm text-muted-foreground">{response.size} bytes</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(responseText, 'response')}>
              <Copy className="h-4 w-4 mr-1" />{copiedField === 'response' ? 'Copied!' : 'Copy Body'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(headerText, 'headers')}>
              <Copy className="h-4 w-4 mr-1" />{copiedField === 'headers' ? 'Copied!' : 'Copy Headers'}
            </Button>
            <Button size="sm" variant="outline" onClick={downloadResponse}>
              <Download className="h-4 w-4 mr-1" />Download
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="pretty" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="pretty">Pretty</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="pretty" className="flex-1 overflow-y-auto p-4">
            <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-muted/50 p-4 rounded-lg">{responseText}</pre>
          </TabsContent>

          <TabsContent value="raw" className="flex-1 overflow-y-auto p-4">
            <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-muted/50 p-4 rounded-lg">{typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}</pre>
          </TabsContent>

          <TabsContent value="headers" className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm font-medium font-mono">{key}:</span>
                  <span className="text-sm font-mono text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Recent Requests</h3>
              <Button size="sm" variant="ghost" onClick={clearHistory}><Trash2 className="h-4 w-4 mr-1" />Clear</Button>
            </div>
            <div className="space-y-2">
              {requestHistory.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
              {requestHistory.map((entry) => (
                <div key={entry.id} className="p-2 rounded border border-border bg-card text-sm flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{entry.method} {entry.url}</div>
                    <div className={cn('font-medium', getStatusColor(entry.status))}>{entry.status}</div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock3 className="h-3 w-3" />{entry.time}ms</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
