import type { StateStorage } from 'zustand/middleware';

const DATABASE_NAME = 'reqwise';
const STORE_NAME = 'zustand';
const STORE_VERSION = 1;

const hasIndexedDb = typeof indexedDB !== 'undefined';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (!hasIndexedDb) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, STORE_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
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

const withStore = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
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

    const value = await withStore('readonly', (store) => store.get(name));
    return typeof value === 'string' ? value : null;
  },
  setItem: async (name, value) => {
    if (!hasIndexedDb) {
      return;
    }

    await withStore('readwrite', (store) => store.put(value, name));
  },
  removeItem: async (name) => {
    if (!hasIndexedDb) {
      return;
    }

    await withStore('readwrite', (store) => store.delete(name));
  },
};
