import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { saveProject, listProjects, pruneToMax } from '../src/lib/db.js';

function setupFakeIndexedDB() {
  const store = { data: new Map() };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const createRequest = (tx, resolver, options = {}) => {
    const autoComplete = options.autoComplete !== false;
    const listeners = { success: [] };
    const req = {
      result: undefined,
      onsuccess: null,
      addEventListener(type, handler) {
        (listeners[type] || (listeners[type] = [])).push(handler);
      },
      _fireSuccess(value) {
        req.result = value;
        const event = { target: req };
        if (typeof req.onsuccess === 'function') req.onsuccess(event);
        (listeners.success || []).forEach((fn) => fn(event));
        if (resolver) resolver(value);
        if (autoComplete && tx) tx._dequeue();
      }
    };
    return req;
  };

  const createCursorRequest = (tx, items) => {
    let index = 0;
    const req = createRequest(tx, null, { autoComplete: false });

    const iterate = () => {
      if (index < items.length) {
        const current = clone(items[index]);
        const cursor = {
          value: current,
          continue() {
            index += 1;
            queueMicrotask(iterate);
          }
        };
        req._fireSuccess(cursor);
      } else {
        req._fireSuccess(null);
        if (tx) tx._dequeue();
      }
    };

    queueMicrotask(iterate);
    return req;
  };

  class FakeObjectStore {
    constructor(tx) {
      this.tx = tx;
    }

    put(value) {
      this.tx._queue();
      const doc = clone(value);
      store.data.set(doc.id, doc);
      const req = createRequest(this.tx);
      queueMicrotask(() => req._fireSuccess(doc.id));
      return req;
    }

    get(key) {
      this.tx._queue();
      const req = createRequest(this.tx);
      const value = clone(store.data.get(key));
      queueMicrotask(() => req._fireSuccess(value));
      return req;
    }

    delete(key) {
      this.tx._queue();
      store.data.delete(key);
      const req = createRequest(this.tx);
      queueMicrotask(() => req._fireSuccess(undefined));
      return req;
    }

    index(field) {
      const txRef = this.tx;
      return {
        openCursor(query, direction) {
          txRef._queue();
          const docs = Array.from(store.data.values())
            .sort((a, b) => (direction === 'prev' ? b[field] - a[field] : a[field] - b[field]));
          return createCursorRequest(txRef, docs);
        }
      };
    }
  }

  class FakeTransaction {
    constructor() {
      this._pending = 0;
      this.oncomplete = null;
      this.onerror = null;
      this.onabort = null;
    }

    _queue() {
      this._pending += 1;
    }

    _dequeue() {
      this._pending -= 1;
      if (this._pending === 0) {
        queueMicrotask(() => {
          if (typeof this.oncomplete === 'function') this.oncomplete();
        });
      }
    }

    objectStore() {
      return new FakeObjectStore(this);
    }
  }

  class FakeDB {
    constructor() {
      this.objectStoreNames = {
        contains() {
          return true;
        }
      };
    }

    createObjectStore() {
      return new FakeObjectStore(new FakeTransaction());
    }

    transaction() {
      return new FakeTransaction();
    }
  }

  globalThis.indexedDB = {
    open() {
      const db = new FakeDB();
      const request = {
        result: db,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null
      };
      queueMicrotask(() => {
        request.onupgradeneeded?.({ target: { result: db } });
        request.onsuccess?.({ target: { result: db } });
      });
      return request;
    }
  };

  return () => {
    delete globalThis.indexedDB;
    store.data.clear();
  };
}

describe('IndexedDB – 20 seneste projekter', () => {
  let cleanup;

  beforeAll(async () => {
    cleanup = setupFakeIndexedDB();
    const now = Date.now();
    for (let i = 0; i < 25; i += 1) {
      await saveProject({ id: 't' + i, state: { id: 't' + i, jobType: 'montage', selectedVariant: 'noAdd' }, updatedAt: now + i });
    }
  });

  afterAll(() => {
    cleanup?.();
  });

  it('pruner ned til maks 20', async () => {
    const removed = await pruneToMax(20);
    expect(removed).toBeGreaterThanOrEqual(0);
    const rows = await listProjects(100);
    expect(rows.length).toBeLessThanOrEqual(20);
    if (rows.length > 1) {
      expect(rows[0].updatedAt >= rows[rows.length - 1].updatedAt).toBe(true);
    }
  });
});
