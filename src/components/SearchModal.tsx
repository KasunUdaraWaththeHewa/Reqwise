
import React, { useEffect, useRef } from 'react';
import { Search, File } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { Dialog, DialogContent } from './ui/dialog';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

export function SearchModal() {
  const {
    requests,
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    toggleSearch,
    openTab,
  } = useApiStore();
  
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredRequests = requests.filter((request) =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      
      if (e.key === 'Escape' && isSearchOpen) {
        toggleSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, toggleSearch]);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSelectRequest = (requestId: string) => {
    openTab(requestId);
    toggleSearch();
    setSearchQuery('');
  };

  return (
    <Dialog open={isSearchOpen} onOpenChange={toggleSearch}>
      <DialogContent className="max-w-2xl p-0 bg-popover border-border">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b border-border p-4">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <Input
              ref={inputRef}
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus:ring-0 text-lg"
            />
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredRequests.length > 0 ? (
              <div className="p-2">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer group"
                    onClick={() => handleSelectRequest(request.id)}
                  >
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={cn('request-method text-xs', `method-${request.method.toLowerCase()}`)}>
                          {request.method}
                        </span>
                        <span className="font-medium text-sm">{request.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {request.url}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No requests found' : 'Start typing to search requests...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
