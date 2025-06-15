
import { create } from 'zustand';

export interface Request {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  queryParams: { key: string; value: string; enabled: boolean }[];
  body: {
    type: 'none' | 'json' | 'form' | 'text';
    content: string;
  };
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  requests: string[];
  isExpanded: boolean;
}

export interface Response {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  time: number;
  size: number;
}

interface Tab {
  id: string;
  requestId: string;
  isModified: boolean;
}

interface ApiState {
  collections: Collection[];
  requests: Request[];
  activeTab: string | null;
  tabs: Tab[];
  responses: Record<string, Response>;
  searchQuery: string;
  isSearchOpen: boolean;
  
  // Actions
  addCollection: (name: string) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  
  addRequest: (collectionId: string, request: Omit<Request, 'id' | 'createdAt'>) => void;
  updateRequest: (id: string, updates: Partial<Request>) => void;
  deleteRequest: (id: string) => void;
  duplicateRequest: (id: string) => void;
  
  openTab: (requestId: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  
  setResponse: (requestId: string, response: Response) => void;
  
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
}

export const useApiStore = create<ApiState>((set, get) => ({
  collections: [
    {
      id: 'default',
      name: 'My Workspace',
      requests: ['default-request'],
      isExpanded: true,
    },
  ],
  requests: [
    {
      id: 'default-request',
      name: 'Sample API Call',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
      ],
      queryParams: [],
      body: {
        type: 'none',
        content: '',
      },
      createdAt: Date.now(),
    },
  ],
  activeTab: 'default-request',
  tabs: [
    { id: 'default-request', requestId: 'default-request', isModified: false },
  ],
  responses: {},
  searchQuery: '',
  isSearchOpen: false,

  addCollection: (name) => {
    const id = `collection-${Date.now()}`;
    set((state) => ({
      collections: [
        ...state.collections,
        { id, name, requests: [], isExpanded: true },
      ],
    }));
  },

  updateCollection: (id, updates) => {
    set((state) => ({
      collections: state.collections.map((col) =>
        col.id === id ? { ...col, ...updates } : col
      ),
    }));
  },

  deleteCollection: (id) => {
    set((state) => ({
      collections: state.collections.filter((col) => col.id !== id),
    }));
  },

  addRequest: (collectionId, request) => {
    const id = `request-${Date.now()}`;
    const newRequest: Request = {
      ...request,
      id,
      createdAt: Date.now(),
    };

    set((state) => ({
      requests: [...state.requests, newRequest],
      collections: state.collections.map((col) =>
        col.id === collectionId
          ? { ...col, requests: [...col.requests, id] }
          : col
      ),
    }));
    
    get().openTab(id);
  },

  updateRequest: (id, updates) => {
    set((state) => ({
      requests: state.requests.map((req) =>
        req.id === id ? { ...req, ...updates } : req
      ),
      tabs: state.tabs.map((tab) =>
        tab.requestId === id ? { ...tab, isModified: true } : tab
      ),
    }));
  },

  deleteRequest: (id) => {
    set((state) => ({
      requests: state.requests.filter((req) => req.id !== id),
      collections: state.collections.map((col) => ({
        ...col,
        requests: col.requests.filter((reqId) => reqId !== id),
      })),
      tabs: state.tabs.filter((tab) => tab.requestId !== id),
      activeTab: state.activeTab === id ? state.tabs[0]?.id || null : state.activeTab,
    }));
  },

  duplicateRequest: (id) => {
    const request = get().requests.find((req) => req.id === id);
    if (request) {
      const collection = get().collections.find((col) =>
        col.requests.includes(id)
      );
      if (collection) {
        get().addRequest(collection.id, {
          ...request,
          name: `${request.name} (Copy)`,
        });
      }
    }
  },

  openTab: (requestId) => {
    const { tabs } = get();
    const existingTab = tabs.find((tab) => tab.requestId === requestId);
    
    if (existingTab) {
      set({ activeTab: existingTab.id });
    } else {
      const newTab = { id: requestId, requestId, isModified: false };
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTab: newTab.id,
      }));
    }
  },

  closeTab: (tabId) => {
    set((state) => {
      const newTabs = state.tabs.filter((tab) => tab.id !== tabId);
      const newActiveTab = state.activeTab === tabId
        ? newTabs[0]?.id || null
        : state.activeTab;
      
      return {
        tabs: newTabs,
        activeTab: newActiveTab,
      };
    });
  },

  setActiveTab: (tabId) => {
    set({ activeTab: tabId });
  },

  setResponse: (requestId, response) => {
    set((state) => ({
      responses: {
        ...state.responses,
        [requestId]: response,
      },
    }));
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  toggleSearch: () => {
    set((state) => ({ isSearchOpen: !state.isSearchOpen }));
  },
}));
