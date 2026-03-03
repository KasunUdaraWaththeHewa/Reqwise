import React, { useRef, useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Search, Folder, File, Copy, Trash2, Upload, Download } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function Sidebar() {
  const {
    collections,
    requests,
    addCollection,
    addRequest,
    updateCollection,
    openTab,
    searchQuery,
    setSearchQuery,
    duplicateRequest,
    deleteRequest,
    responses,
  } = useApiStore();

  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRequests = requests.filter((request) =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    addCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsCreatingCollection(false);
  };

  const handleAddRequest = (collectionId: string) => {
    addRequest(collectionId, {
      name: 'New Request',
      method: 'GET',
      url: 'https://',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      queryParams: [],
      body: { type: 'none', content: '' },
      settings: {
        timeoutMs: 30000,
        loadTest: { iterations: 10, concurrency: 2, delayMs: 0 },
        automation: { enabled: false, intervalMs: 60000, maxRuns: 0, stopOnFailure: false },
      },
      envVars: [],
      tests: [],
    });
  };

  const handleExportWorkspace = () => {
    const state = useApiStore.getState();
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      collections: state.collections,
      requests: state.requests,
      globalEnvVars: state.globalEnvVars,
      workspaceEnvVars: state.workspaceEnvVars,
      collectionEnvVars: state.collectionEnvVars,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reqwise-workspace-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Workspace exported');
  };

  const handleImportWorkspace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.collections) || !Array.isArray(parsed.requests)) {
        throw new Error('Invalid workspace file');
      }

      useApiStore.setState((state) => ({
        collections: parsed.collections,
        requests: parsed.requests.map((request: typeof state.requests[number]) => ({
          ...request,
          settings: {
            timeoutMs: request.settings?.timeoutMs ?? 30000,
            loadTest: {
              iterations: request.settings?.loadTest?.iterations ?? 10,
              concurrency: request.settings?.loadTest?.concurrency ?? 2,
              delayMs: request.settings?.loadTest?.delayMs ?? 0,
            },
            automation: {
              enabled: request.settings?.automation?.enabled ?? false,
              intervalMs: request.settings?.automation?.intervalMs ?? 60000,
              maxRuns: request.settings?.automation?.maxRuns ?? 0,
              stopOnFailure: request.settings?.automation?.stopOnFailure ?? false,
            },
          },
          envVars: request.envVars ?? [],
          tests: request.tests ?? [],
        })),
        globalEnvVars: Array.isArray(parsed.globalEnvVars) ? parsed.globalEnvVars : state.globalEnvVars,
        workspaceEnvVars: Array.isArray(parsed.workspaceEnvVars) ? parsed.workspaceEnvVars : state.workspaceEnvVars,
        collectionEnvVars: parsed.collectionEnvVars && typeof parsed.collectionEnvVars === 'object'
          ? parsed.collectionEnvVars
          : state.collectionEnvVars,
      }));

      toast.success('Workspace imported');
    } catch {
      toast.error('Could not import workspace file');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="mb-3 flex items-center gap-2">
          <img src="/reqwise-logo.svg" alt="Reqwise logo" className="h-7 w-7 rounded-md" />
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">Reqwise</p>
            <p className="text-[11px] text-muted-foreground">HTTP Testing Tool</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Collections</h2>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={handleExportWorkspace} className="h-8 w-8 p-0 hover:bg-sidebar-accent">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-8 w-8 p-0 hover:bg-sidebar-accent">
              <Upload className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreatingCollection(true)} className="h-8 w-8 p-0 hover:bg-sidebar-accent">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportWorkspace}
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border focus:border-sidebar-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isCreatingCollection && (
          <div className="p-3 border-b border-sidebar-border">
            <Input
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
              onBlur={handleCreateCollection}
              autoFocus
              className="bg-sidebar-accent border-sidebar-border"
            />
          </div>
        )}

        {collections.map((collection) => {
          const collectionRequests = collection.requests
            .map((id) => requests.find((req) => req.id === id))
            .filter(Boolean)
            .filter((req) => !searchQuery || filteredRequests.includes(req!));

          return (
            <div key={collection.id} className="border-b border-sidebar-border">
              <div className="flex items-center justify-between p-3 hover:bg-sidebar-accent cursor-pointer group" onClick={() => updateCollection(collection.id, { isExpanded: !collection.isExpanded })}>
                <div className="flex items-center space-x-2 min-w-0">
                  {collection.isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <Folder className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-sidebar-foreground truncate">{collection.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddRequest(collection.id);
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sidebar-accent"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {collection.isExpanded && (
                <div className="pb-2">
                  {collectionRequests.map((request) => (
                    <div key={request!.id} className="flex items-center space-x-2 p-2 mx-3 rounded-md hover:bg-sidebar-accent cursor-pointer group" onClick={() => openTab(request!.id)}>
                      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={cn('request-method text-xs', `method-${request!.method.toLowerCase()}`)}>{request!.method}</span>
                          <span className="text-sm text-sidebar-foreground truncate">{request!.name}</span>
                          {responses[request!.id]?.testSummary && (
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                responses[request!.id].testSummary?.failed
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-green-500/15 text-green-400'
                              )}
                            >
                              {responses[request!.id].testSummary?.failed
                                ? `${responses[request!.id].testSummary?.failed} failed`
                                : `${responses[request!.id].testSummary?.passed} passed`}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{request!.url}</div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateRequest(request!.id);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-destructive/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRequest(request!.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {collectionRequests.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No requests</p>
                      <Button size="sm" variant="ghost" onClick={() => handleAddRequest(collection.id)} className="mt-2 text-xs">
                        Add first request
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
