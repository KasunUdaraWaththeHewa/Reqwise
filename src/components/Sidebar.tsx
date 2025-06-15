
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Search, Folder, File } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

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
  } = useApiStore();

  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const filteredRequests = requests.filter((request) =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      addCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsCreatingCollection(false);
    }
  };

  const handleAddRequest = (collectionId: string) => {
    addRequest(collectionId, {
      name: 'New Request',
      method: 'GET',
      url: 'https://',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      queryParams: [],
      body: { type: 'none', content: '' },
    });
  };

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Collections</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreatingCollection(true)}
            className="h-8 w-8 p-0 hover:bg-sidebar-accent"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border focus:border-sidebar-ring"
          />
        </div>
      </div>

      {/* Collections */}
      <div className="flex-1 overflow-y-auto">
        {isCreatingCollection && (
          <div className="p-3 border-b border-sidebar-border">
            <Input
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
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
              <div
                className="flex items-center justify-between p-3 hover:bg-sidebar-accent cursor-pointer group"
                onClick={() => updateCollection(collection.id, { isExpanded: !collection.isExpanded })}
              >
                <div className="flex items-center space-x-2">
                  {collection.isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Folder className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-sidebar-foreground">
                    {collection.name}
                  </span>
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
                    <div
                      key={request!.id}
                      className="flex items-center space-x-2 p-2 mx-3 rounded-md hover:bg-sidebar-accent cursor-pointer group"
                      onClick={() => openTab(request!.id)}
                    >
                      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={cn('request-method text-xs', `method-${request!.method.toLowerCase()}`)}>
                            {request!.method}
                          </span>
                          <span className="text-sm text-sidebar-foreground truncate">
                            {request!.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {request!.url}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {collectionRequests.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No requests</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddRequest(collection.id)}
                        className="mt-2 text-xs"
                      >
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
