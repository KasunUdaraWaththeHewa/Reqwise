import type { StateStorage } from 'zustand/middleware';

const DATABASE_NAME = 'reqwise';
const LEGACY_STORE_NAME = 'zustand';
const META_STORE_NAME = 'persist-meta';
const STORE_VERSION = 2;

const PERSISTED_STATE_KEYS = [
  'collections',
  'requests',
  'tabs',
  'activeTab',
  'responses',
  'requestHistory',
  'globalEnvVars',
  'workspaceEnvVars',
  'collectionEnvVars',
] as const;

type PersistedStateKey = (typeof PERSISTED_STATE_KEYS)[number];

type PersistedPayload = {
  state?: Partial<Record<PersistedStateKey, unknown>>;
  version?: number;
};

const hasIndexedDb = typeof indexedDB !== 'undefined';

let dbPromise: Promise<IDBDatabase> | null = null;

const getStoreName = (key: PersistedStateKey): string => `persist-${key}`;

const runRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });

const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  });

const openDatabase = (): Promise<IDBDatabase> => {
  if (!hasIndexedDb) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, STORE_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
          db.createObjectStore(LEGACY_STORE_NAME);
        }

        if (!db.objectStoreNames.contains(META_STORE_NAME)) {
          db.createObjectStore(META_STORE_NAME);
        }

        for (const key of PERSISTED_STATE_KEYS) {
          const storeName = getStoreName(key);
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open IndexedDB.'));
      };
    });
  }

  return dbPromise;
};

const readStructuredState = async (name: string): Promise<string | null> => {
  const db = await openDatabase();
  const transaction = db.transaction([META_STORE_NAME, ...PERSISTED_STATE_KEYS.map(getStoreName)], 'readonly');

  const state: Partial<Record<PersistedStateKey, unknown>> = {};
  let hasData = false;

  for (const key of PERSISTED_STATE_KEYS) {
    const value = await runRequest(transaction.objectStore(getStoreName(key)).get('value'));
    if (typeof value !== 'undefined') {
      state[key] = value;
      hasData = true;
    }
  }

  const versionValue = await runRequest(transaction.objectStore(META_STORE_NAME).get(`version:${name}`));
  await waitForTransaction(transaction);

  if (!hasData) {
    return null;
  }

  return JSON.stringify({
    state,
    version: typeof versionValue === 'number' ? versionValue : 0,
  });
};

const writeStructuredState = async (name: string, payload: PersistedPayload): Promise<void> => {
  const db = await openDatabase();
  const transaction = db.transaction(
    [LEGACY_STORE_NAME, META_STORE_NAME, ...PERSISTED_STATE_KEYS.map(getStoreName)],
    'readwrite',
  );

  for (const key of PERSISTED_STATE_KEYS) {
    const store = transaction.objectStore(getStoreName(key));
    if (Object.prototype.hasOwnProperty.call(payload.state ?? {}, key)) {
      await runRequest(store.put(payload.state?.[key], 'value'));
    } else {
      await runRequest(store.delete('value'));
    }
  }

  const metaStore = transaction.objectStore(META_STORE_NAME);
  await runRequest(metaStore.put(payload.version ?? 0, `version:${name}`));

  await runRequest(transaction.objectStore(LEGACY_STORE_NAME).delete(name));
  await waitForTransaction(transaction);
};

const withLegacyStore = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LEGACY_STORE_NAME, mode);
    const store = transaction.objectStore(LEGACY_STORE_NAME);
    const request = action(store);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };
  });
};

export const indexedDbStorage: StateStorage = {
  getItem: async (name) => {
    if (!hasIndexedDb) {
      return null;
    }

    const structuredValue = await readStructuredState(name);
    if (structuredValue) {
      return structuredValue;
    }

    const legacyValue = await withLegacyStore('readonly', (store) => store.get(name));
    return typeof legacyValue === 'string' ? legacyValue : null;
  },
  setItem: async (name, value) => {
    if (!hasIndexedDb) {
      return;
    }

    let parsed: PersistedPayload | null = null;

    try {
      parsed = JSON.parse(value) as PersistedPayload;
    } catch {
      parsed = null;
    }

    if (parsed?.state && typeof parsed.state === 'object') {
      await writeStructuredState(name, parsed);
      return;
    }

    await withLegacyStore('readwrite', (store) => store.put(value, name));
  },
  removeItem: async (name) => {
    if (!hasIndexedDb) {
      return;
    }

    const db = await openDatabase();
    const transaction = db.transaction(
      [LEGACY_STORE_NAME, META_STORE_NAME, ...PERSISTED_STATE_KEYS.map(getStoreName)],
      'readwrite',
    );

    for (const key of PERSISTED_STATE_KEYS) {
      await runRequest(transaction.objectStore(getStoreName(key)).delete('value'));
    }

    await runRequest(transaction.objectStore(META_STORE_NAME).delete(`version:${name}`));
    await runRequest(transaction.objectStore(LEGACY_STORE_NAME).delete(name));
    await waitForTransaction(transaction);
  },
};
