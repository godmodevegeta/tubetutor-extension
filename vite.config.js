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
        // The popup is the default HTML entry
        popup: 'index.html', 
        // Your background and content scripts are separate entries
        background: 'src/background.js',
        content: 'src/content.js',
      },
      output: {
        // Configure how the output files are named
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});