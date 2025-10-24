import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    // Make sure the output directory is 'dist' which is standard
    outDir: 'dist',
    // This is crucial for Chrome extensions
    emptyOutDir: false, 
    rollupOptions: {
      // Define the entry points for your extension
      input: {
        popup: 'index.html', 
        background: 'src/background.js',
        content: 'src/content.js',
        panel: 'panel.html' // The iframe is now a primary entry point
      },
      output: {
        // Configure how the output files are named
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  // --- THIS SECTION IS FOR VITEST ---
  test: {
    // This allows us to use 'vi' and 'expect' in our test files
    // without importing them explicitly.
    globals: true,
    // This tells Vitest to simulate a browser-like environment.
    environment: 'jsdom', 
    // This points to our setup file where we'll create the chrome mock.
    setupFiles: './src/tests/setup.js', 
  },
});