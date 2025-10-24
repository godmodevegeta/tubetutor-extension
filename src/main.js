// File: src/main.js (Svelte 4 Version)

import App from './App.svelte';
import './app.css';

// This is the standard Svelte 4 way to mount the main component.
// It will target the <body> of your popup.html.
const app = new App({
  target: document.body,
});

export default app;