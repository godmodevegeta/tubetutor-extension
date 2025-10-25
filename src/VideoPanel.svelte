<!-- File: src/VideoPanel.svelte (The Main Application Shell) -->

<script>
  import NotesView from './NotesView.svelte';
  import QuizView from './QuizView.svelte';
  import ChatView from './ChatView.svelte';
  import { onMount } from 'svelte';
  import { chatCommand } from './stores.js';

  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('videoId');
  
  // State for the main panel
  let activeView = 'Summary';
  const views = { Summary: NotesView, Quiz: QuizView, Chat: ChatView };
  
  // --- NEW: State for our fetched data ---
  let transcript = null;
  let transcriptError = '';

  onMount(() => {
    // Fetch the transcript as soon as the panel loads.
    // This data will be passed down to all child components.
    console.log('[VideoPanel] Mounting. Fetching transcript for', videoId);
    chrome.runtime.sendMessage(
      { type: 'GET_TRANSCRIPT', payload: { videoId } },
      (response) => {
        if (response?.success) {
          transcript = response.transcript;
          console.log('[VideoPanel] Transcript received.');
        } else {
          transcriptError = response?.error || 'Failed to load transcript.';
          console.error('[VideoPanel] Transcript error:', transcriptError);
        }
      }
    );
  });
  // This function will be passed down to the child components
  function navigateTo(viewName) {
    activeView = viewName;
  }
</script>

<!-- --- THE DEFINITIVE THEME FIX --- -->
<svelte:head>
  <style>
    /* 1. Define all theme variables on the :root, which is the <html> element
          inside our iframe. This is the highest possible level. */
    :root {
      /* Light Mode Defaults */
      --panel-bg: #ffffff;
      --panel-border: rgba(0, 0, 0, 0.1);
      --panel-text-primary: #0f0f0f;
      --panel-text-secondary: #606060;
      --panel-header-border: rgba(0, 0, 0, 0.1);
      --panel-subtle-bg: #f2f2f2;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        /* Dark Mode Overrides */
        --panel-bg: #212121;
        --panel-border: rgba(255, 255, 255, 0.2);
        --panel-text-primary: #ffffff;
        --panel-text-secondary: #aaaaaa;
        --panel-header-border: rgba(255, 255, 255, 0.2);
        --panel-subtle-bg: #181818;
      }
    }

    /* 2. Apply the base theme directly to the body. */
    body {
      background-color: var(--panel-bg);
      color: var(--panel-text-primary);
      font-family: "Roboto", "Arial", sans-serif;
      margin: 0;
      padding: 0;
    }
  </style>
</svelte:head>

<div class="tubetutor-panel">
  <!-- 1. The Header -->
  <div class="panel-header">
    <img src="/images/icon128.png" alt="I'm Maddie" class="panel-icon" />
    <h2 class="header-title">Hey there! I'm Maddie</h2>
  </div>

  <!-- 2. The Tab Navigation Bar -->
  <div class="tab-nav">
    <!-- We loop over our views object to create the buttons -->
    {#each Object.keys(views) as viewName}
      <button
        class="tab-button"
        class:active={activeView === viewName}
        on:click={() => activeView = viewName}
      >
        {viewName}
      </button>
    {/each}
  </div>

  <!-- 3. The Dynamic Content Area -->
  <div class="content-area">
    <!-- This is the magic of Svelte. The <svelte:component> tag
         dynamically renders the component specified by 'views[activeView]'.
         When 'activeView' changes, this component automatically swaps. -->
    <svelte:component 
      this={views[activeView]} 
      {transcript} 
      {transcriptError} 
      onNavigate={navigateTo}
    />
  </div>

</div>


<!-- The STYLE section is now much simpler -->
<style>
  /* --- Main Panel Shell --- */
  .tubetutor-panel {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background-color: transparent; /* The body provides the background now */
  }

  /* --- Header --- */
  .panel-header {
    display: flex;
    align-items: center;
    gap: 12px; 
    padding: 0 16px;
    height: 48px;
    border-bottom: 1px solid var(--panel-header-border);
    flex-shrink: 0;
  }
  .panel-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    flex-shrink: 0; /* Prevents icon from shrinking */
  }
  .header-title {
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 18px;
    font-weight: 500;
    margin: 0;
  }

  /* --- Tab Navigation --- */
  .tab-nav {
    display: flex;
    border-bottom: 1px solid var(--panel-header-border);
    flex-shrink: 0;
  }
  .tab-button {
    font-size: 14px;
    font-weight: 500;
    color: var(--panel-text-secondary); /* This will now inherit correctly */
    background-color: transparent;
    border: none;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
  .tab-button:hover {
    background-color: var(--panel-subtle-bg);
  }
  .tab-button.active {
    color: var(--panel-text-primary);
    border-bottom-color: var(--panel-text-primary);
  }

  /* --- Content Area --- */
  .content-area {
    flex-grow: 1;
    overflow-y: auto;
  }
</style>