import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveProject, listProjects, pruneToMax, getProject } from '../src/lib/db.js';

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

describe('IndexedDB persistence og retention', () => {
  let cleanup;

  beforeEach(() => {
    cleanup = setupFakeIndexedDB();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('gemmer, henter og merger eksisterende projekter', async () => {
    await saveProject({
      id: 'merge-1',
      state: {
        id: 'merge-1',
        jobType: 'montage',
        selectedVariant: 'noAdd',
        materialsSum: 4200,
        workers: [
          { name: 'A', hours: 7, hourlyWithAllowances: 250 },
          { name: 'B', hours: 6.5, hourlyWithAllowances: 255 }
        ]
      },
      updatedAt: 1000
    });

    let stored = await getProject('merge-1');
    expect(stored?.payload?.materialsSum).toBe(4200);
    expect(stored?.payload?.workers).toHaveLength(2);

    await saveProject({
      id: 'merge-1',
      state: {
        extraWorkKr: 188.6,
        workers: [
          { hourlyWithAllowances: 260 },
          { hours: 7 }
        ]
      },
      updatedAt: 2000
    });

    stored = await getProject('merge-1');
    expect(stored?.updatedAt).toBe(2000);
    expect(stored?.payload?.materialsSum).toBe(4200);
    expect(stored?.payload?.extraWorkKr).toBe(188.6);
    expect(stored?.payload?.workers).toHaveLength(2);
    expect(stored?.payload?.workers?.[0]).toMatchObject({ hours: 7, hourlyWithAllowances: 260 });
    expect(stored?.payload?.workers?.[1]).toMatchObject({ hours: 7, hourlyWithAllowances: 255 });
  });

  it('pruner og sorterer seneste 20 projekter', async () => {
    const now = Date.now();
    for (let i = 0; i < 25; i += 1) {
      await saveProject({
        id: 'case-' + i,
        state: { id: 'case-' + i, jobType: 'montage', selectedVariant: 'noAdd' },
        updatedAt: now + i
      });
    }

    const removed = await pruneToMax(20);
    expect(removed).toBeGreaterThanOrEqual(0);

    const rows = await listProjects(50);
    expect(rows.length).toBeLessThanOrEqual(20);
    const updates = rows.map((row) => row.updatedAt);
    const sorted = [...updates].sort((a, b) => b - a);
    expect(updates).toEqual(sorted);
    if (rows.length === 20) {
      expect(rows[0].id).toBe('case-24');
      expect(rows[rows.length - 1].id).toBe('case-5');
    }
  });
});
