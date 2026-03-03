
import React from 'react';
import { X } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { cn } from '../lib/utils';

export function RequestTabs() {
  const { tabs, activeTab, requests, setActiveTab, closeTab } = useApiStore();

  if (tabs.length === 0) {
    return (
      <div className="h-10 border-b border-border flex items-center px-3">
        <span className="text-xs text-muted-foreground">No requests open</span>
      </div>
    );
  }

  return (
    <div className="h-10 border-b border-border bg-card">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => {
          const request = requests.find((req) => req.id === tab.requestId);
          if (!request) return null;

          return (
            <div
              key={tab.id}
              className={cn(
                'flex items-center space-x-1.5 px-3 py-2 border-r border-border cursor-pointer group min-w-0 max-w-[14rem]',
                'hover:bg-accent transition-colors',
                activeTab === tab.id ? 'bg-accent border-b-2 border-primary' : ''
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={cn('request-method text-xs flex-shrink-0', `method-${request.method.toLowerCase()}`)}>
                {request.method}
              </span>
              <span className="text-xs truncate flex-1">
                {request.name}
                {tab.isModified && <span className="text-primary ml-1">•</span>}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-destructive/20 rounded p-1 transition-all"
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
