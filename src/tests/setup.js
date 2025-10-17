// src/tests/setup.js
import { vi } from 'vitest';

// This is our in-memory "database" for the mock storage.
let storage = {};

// Create a mock of the 'chrome' global object.
const chromeMock = {
  runtime: {
    // Mock the onMessage listener
    onMessage: {
      addListener: vi.fn(),
    },
    // Mock the sendMessage function
    sendMessage: vi.fn(),
    // Mock the lastError property
    lastError: undefined,
  },
  storage: {
    local: {
      // Mock the get method
      get: vi.fn((keys, callback) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [Object.keys(keys)[0]];
        keyList.forEach(key => {
          result[key] = storage[key] || (Array.isArray(keys) ? undefined : keys[key]);
        });
        callback(result);
      }),
      // Mock the set method
      set: vi.fn((items, callback) => {
        storage = { ...storage, ...items };
        if (callback) {
          callback();
        }
      }),
      // A helper for our tests to clear the storage
      clear: vi.fn(() => {
        storage = {};
      })
    },
  },
};
