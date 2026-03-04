import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { indexedDbStorage } from '@/lib/indexedDbStorage';

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  secret: boolean;
}

export interface TestAssertion {
  id: string;
  type: 'statusEquals' | 'responseTimeLessThan' | 'jsonPathExists' | 'bodyContains' | 'headerEquals' | 'jsonPathEquals' | 'bodyMatchesRegex';
  enabled: boolean;
  expectedValue: string;
}

export interface TestResult {
  id: string;
  type: TestAssertion['type'];
  passed: boolean;
  message: string;
}

export interface LoadTestResult {
  iteration: number;
  status: number;
  time: number;
  size: number;
  error?: string;
}

export interface LoadTestSummary {
  iterations: number;
  concurrency: number;
  delayMs: number;
  totalDurationMs: number;
  requestsPerSecond: number;
  successfulRequests: number;
  failedRequests: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  avgResponseTimeMs: number;
  p50ResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  results: LoadTestResult[];
}

export interface Request {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  queryParams: { key: string; value: string; enabled: boolean }[];
  body: {
    type: 'none' | 'json' | 'form' | 'text' | 'x-www-form-urlencoded' | 'multipart';
    content: string;
  };
  auth: {
    type: 'none' | 'bearer' | 'basic' | 'apiKey';
    token: string;
    username: string;
    password: string;
    apiKeyHeader: string;
    apiKeyValue: string;
  };
  settings: {
    timeoutMs: number;
    loadTest: {
      iterations: number;
      concurrency: number;
      delayMs: number;
    };
    automation: {
      enabled: boolean;
      intervalMs: number;
      maxRuns: number;
      stopOnFailure: boolean;
    };
  };
  envVars: EnvVariable[];
  tests: TestAssertion[];
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
  testResults?: TestResult[];
  testSummary?: {
    passed: number;
    failed: number;
  };
  loadTestSummary?: LoadTestSummary;
  previousData?: unknown;
}

export interface RequestHistoryEntry {
  id: string;
  requestId: string;
  method: Request['method'];
  url: string;
  status: number;
  time: number;
  tests?: {
    passed: number;
    failed: number;
  };
  loadTest?: {
    iterations: number;
    failedRequests: number;
    requestsPerSecond: number;
  };
  createdAt: number;
}


export interface CollectionRunReport {
  id: string;
  collectionId: string;
  collectionName: string;
  createdAt: number;
  totalRequests: number;
  passedRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number;
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
  requestHistory: RequestHistoryEntry[];
  searchQuery: string;
  isSearchOpen: boolean;
  globalEnvVars: EnvVariable[];
  workspaceEnvVars: EnvVariable[];
  collectionEnvVars: Record<string, EnvVariable[]>;
  runReports: CollectionRunReport[];

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
  clearHistory: () => void;

  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;

  setGlobalEnvVars: (variables: EnvVariable[]) => void;
  setWorkspaceEnvVars: (variables: EnvVariable[]) => void;
  setCollectionEnvVars: (collectionId: string, variables: EnvVariable[]) => void;
  addRunReport: (report: Omit<CollectionRunReport, 'id' | 'createdAt'>) => void;
}

export const useApiStore = create<ApiState>()(persist((set, get) => ({
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
      auth: {
        type: 'none',
        token: '',
        username: '',
        password: '',
        apiKeyHeader: 'X-API-Key',
        apiKeyValue: '',
      },
      settings: {
        timeoutMs: 30000,
        loadTest: {
          iterations: 10,
          concurrency: 2,
          delayMs: 0,
        },
        automation: {
          enabled: false,
          intervalMs: 60000,
          maxRuns: 0,
          stopOnFailure: false,
        },
      },
      envVars: [],
      tests: [],
      createdAt: Date.now(),
    },
  ],
  activeTab: 'default-request',
  tabs: [
    { id: 'default-request', requestId: 'default-request', isModified: false },
  ],
  responses: {},
  requestHistory: [],
  searchQuery: '',
  isSearchOpen: false,
  globalEnvVars: [],
  workspaceEnvVars: [],
  collectionEnvVars: {},
  runReports: [],

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
    const request = get().requests.find((req) => req.id === requestId);

    set((state) => ({
      responses: {
        ...state.responses,
        [requestId]: {
          ...response,
          previousData: state.responses[requestId]?.data,
        },
      },
      requestHistory: request
        ? [
            {
              id: `history-${Date.now()}`,
              requestId,
              method: request.method,
              url: request.url,
              status: response.status,
              time: response.time,
              tests: response.testSummary,
              loadTest: response.loadTestSummary
                ? {
                    iterations: response.loadTestSummary.iterations,
                    failedRequests: response.loadTestSummary.failedRequests,
                    requestsPerSecond: response.loadTestSummary.requestsPerSecond,
                  }
                : undefined,
              createdAt: Date.now(),
            },
            ...state.requestHistory,
          ].slice(0, 50)
        : state.requestHistory,
      tabs: state.tabs.map((tab) =>
        tab.requestId === requestId ? { ...tab, isModified: false } : tab
      ),
    }));
  },

  clearHistory: () => {
    set({ requestHistory: [] });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  toggleSearch: () => {
    set((state) => ({ isSearchOpen: !state.isSearchOpen }));
  },

  setSearchOpen: (open) => {
    set({ isSearchOpen: open });
  },

  setGlobalEnvVars: (variables) => {
    set({ globalEnvVars: variables });
  },

  setWorkspaceEnvVars: (variables) => {
    set({ workspaceEnvVars: variables });
  },

  setCollectionEnvVars: (collectionId, variables) => {
    set((state) => ({
      collectionEnvVars: {
        ...state.collectionEnvVars,
        [collectionId]: variables,
      },
    }));
  },

  addRunReport: (report) => {
    set((state) => ({
      runReports: [
        {
          id: `report-${Date.now()}`,
          createdAt: Date.now(),
          ...report,
        },
        ...state.runReports,
      ].slice(0, 30),
    }));
  },
}), {
  name: 'reqwise-store',
  storage: createJSONStorage(() => indexedDbStorage),
  partialize: (state) => ({
    collections: state.collections,
    requests: state.requests,
    tabs: state.tabs,
    activeTab: state.activeTab,
    responses: state.responses,
    requestHistory: state.requestHistory,
    globalEnvVars: state.globalEnvVars,
    workspaceEnvVars: state.workspaceEnvVars,
    collectionEnvVars: state.collectionEnvVars,
    runReports: state.runReports,
  }),
}));
