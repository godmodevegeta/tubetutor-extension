// File: src/stores.js

import { writable } from 'svelte/store';

// This store will hold commands for the chat component.
// The initial value is null (no command).
export const chatCommand = writable(null);