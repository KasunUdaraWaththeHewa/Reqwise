import React, { useState } from 'react';
import { Copy, Download, Clock3, Trash2 } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { prettifyJson, getStatusColor } from '../lib/utils';
import { cn } from '../lib/utils';

export function ResponseViewer() {
  const { activeTab, responses, requestHistory, clearHistory } = useApiStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [responseSearch, setResponseSearch] = useState('');

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
  const filteredResponseText = !responseSearch.trim()
    ? responseText
    : responseText
        .split('\n')
        .filter((line) => line.toLowerCase().includes(responseSearch.toLowerCase()))
        .join('\n');
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
            {response.testSummary && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Tests:</span>
                <span className="text-sm text-green-400">{response.testSummary.passed} passed</span>
                <span className="text-sm text-red-400">{response.testSummary.failed} failed</span>
              </div>
            )}
            {response.loadTestSummary && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Load:</span>
                <span className="text-sm text-muted-foreground">{response.loadTestSummary.iterations} req</span>
                <span className="text-sm text-muted-foreground">{response.loadTestSummary.requestsPerSecond} rps</span>
              </div>
            )}
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
          <TabsList className="grid w-full grid-cols-6 bg-muted">
            <TabsTrigger value="pretty">Pretty</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="load">Load Test</TabsTrigger>
          </TabsList>

          <TabsContent value="pretty" className="flex-1 overflow-y-auto p-4 space-y-3">
            <Input
              placeholder="Search response..."
              value={responseSearch}
              onChange={(e) => setResponseSearch(e.target.value)}
              className="max-w-sm"
            />
            <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-muted/50 p-4 rounded-lg">{filteredResponseText || 'No lines matched the search filter.'}</pre>
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
                    <div className="flex items-center gap-2">
                      <div className={cn('font-medium', getStatusColor(entry.status))}>{entry.status}</div>
                      {entry.tests && (
                        <div className="text-xs">
                          <span className="text-green-400">{entry.tests.passed}p</span>
                          <span className="mx-1 text-muted-foreground">/</span>
                          <span className="text-red-400">{entry.tests.failed}f</span>
                        </div>
                      )}
                      {entry.loadTest && (
                        <div className="text-xs text-muted-foreground">
                          LT {entry.loadTest.iterations} req • {entry.loadTest.requestsPerSecond} rps • {entry.loadTest.failedRequests} failed
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock3 className="h-3 w-3" />{entry.time}ms</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tests" className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {!response.testResults || response.testResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tests were configured for this request.</p>
              ) : (
                response.testResults.map((result) => (
                  <div key={result.id} className="p-2 rounded border border-border bg-card text-sm flex items-center justify-between">
                    <div className="text-muted-foreground">{result.message}</div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded",
                      result.passed ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                    )}>
                      {result.passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="load" className="flex-1 overflow-y-auto p-4">
            {!response.loadTestSummary ? (
              <p className="text-sm text-muted-foreground">No load test data available. Run a load test from the request editor.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">Iterations</div><div className="font-semibold">{response.loadTestSummary.iterations}</div></div>
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">Concurrency</div><div className="font-semibold">{response.loadTestSummary.concurrency}</div></div>
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">RPS</div><div className="font-semibold">{response.loadTestSummary.requestsPerSecond}</div></div>
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">Duration</div><div className="font-semibold">{response.loadTestSummary.totalDurationMs}ms</div></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">Avg</div><div className="font-semibold">{response.loadTestSummary.avgResponseTimeMs}ms</div></div>
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">P50</div><div className="font-semibold">{response.loadTestSummary.p50ResponseTimeMs}ms</div></div>
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">P95</div><div className="font-semibold">{response.loadTestSummary.p95ResponseTimeMs}ms</div></div>
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">P99</div><div className="font-semibold">{response.loadTestSummary.p99ResponseTimeMs}ms</div></div>
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">Min</div><div className="font-semibold">{response.loadTestSummary.minResponseTimeMs}ms</div></div>
                  <div className="p-3 rounded border border-border bg-card"><div className="text-muted-foreground">Max</div><div className="font-semibold">{response.loadTestSummary.maxResponseTimeMs}ms</div></div>
                </div>

                <div className="text-sm">
                  <span className="text-green-400 font-medium">{response.loadTestSummary.successfulRequests} succeeded</span>
                  <span className="mx-2 text-muted-foreground">/</span>
                  <span className="text-red-400 font-medium">{response.loadTestSummary.failedRequests} failed</span>
                </div>

                <div className="space-y-2">
                  {response.loadTestSummary.results.slice(0, 20).map((result) => (
                    <div key={result.iteration} className="p-2 rounded border border-border bg-card text-sm flex items-center justify-between">
                      <div className="font-mono text-xs text-muted-foreground">#{result.iteration} • status {result.status}</div>
                      <div className="flex items-center gap-3">
                        <span>{result.time}ms</span>
                        {result.error && <span className="text-red-400">{result.error}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
