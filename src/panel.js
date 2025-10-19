// File: src/panel.js

import VideoPanel from './VideoPanel.svelte';

// This script runs inside the clean iframe. Its only job
// is to mount our main Svelte component to the iframe's body.
new VideoPanel({
  target: document.body,
});