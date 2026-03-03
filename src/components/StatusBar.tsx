import React from 'react';
import { useApiStore } from '../store/apiStore';
import { formatTime, formatBytes, getStatusColor } from '../lib/utils';
import { cn } from '../lib/utils';

export function StatusBar() {
  const { activeTab, responses } = useApiStore();

  const response = activeTab ? responses[activeTab] : null;

  return (
    <div className="h-8 bg-card border-t border-border flex items-center justify-between px-4 text-xs">
      <div className="flex items-center space-x-4">
        {response ? (
          <>
            <span className={cn('font-medium', getStatusColor(response.status))}>{response.status} {response.statusText}</span>
            <span className="text-muted-foreground">{formatTime(response.time)}</span>
            <span className="text-muted-foreground">{formatBytes(response.size)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Ready</span>
        )}
      </div>

      <div className="flex items-center space-x-4 text-muted-foreground">
        <span>⌘/Ctrl+K Search</span>
        <span>⌘/Ctrl+Enter Send</span>
        <span>⌘/Ctrl+S Save</span>
      </div>
    </div>
  );
}
