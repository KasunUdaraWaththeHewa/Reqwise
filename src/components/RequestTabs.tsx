
import React from 'react';
import { X } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { cn } from '../lib/utils';

export function RequestTabs() {
  const { tabs, activeTab, requests, setActiveTab, closeTab } = useApiStore();

  if (tabs.length === 0) {
    return (
      <div className="h-12 border-b border-border flex items-center px-4">
        <span className="text-sm text-muted-foreground">No requests open</span>
      </div>
    );
  }

  return (
    <div className="h-12 border-b border-border bg-card">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => {
          const request = requests.find((req) => req.id === tab.requestId);
          if (!request) return null;

          return (
            <div
              key={tab.id}
              className={cn(
                'flex items-center space-x-2 px-4 py-3 border-r border-border cursor-pointer group min-w-0 max-w-xs',
                'hover:bg-accent transition-colors',
                activeTab === tab.id ? 'bg-accent border-b-2 border-primary' : ''
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={cn('request-method text-xs flex-shrink-0', `method-${request.method.toLowerCase()}`)}>
                {request.method}
              </span>
              <span className="text-sm truncate flex-1">
                {request.name}
                {tab.isModified && <span className="text-primary ml-1">•</span>}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded p-1 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
