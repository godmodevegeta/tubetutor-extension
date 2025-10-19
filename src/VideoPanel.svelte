<!-- File: src/VideoPanel.svelte (The Main Application Shell) -->

<script>
  import NotesView from './NotesView.svelte';
  import QuizView from './QuizView.svelte';
  import ChatView from './ChatView.svelte';
  import { onMount } from 'svelte';

  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('videoId');
  
  // State for the main panel
  let activeView = 'Notes';
  const views = { Notes: NotesView, Quiz: QuizView, Chat: ChatView };
  
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
</script>

<!-- --- NEW svelte:head BLOCK --- -->
<!-- This injects styles into the <head> of our iframe's document,
     allowing us to control the base styles for the entire app. -->
<svelte:head>
  <style>
    body {
      /* Apply our theme variables to the body itself */
      background-color: var(--panel-bg);
      color: var(--panel-text-primary);
      font-family: "Roboto", "Arial", sans-serif;

      /* A standard CSS reset for the body */
      margin: 0;
      padding: 0;
    }
  </style>
</svelte:head>



<div class="tubetutor-panel">
  <!-- 1. The Header -->
  <div class="panel-header">
    <h2 class="header-title">TubeTutor</h2>
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
    <svelte:component this={views[activeView]} {transcript} {transcriptError} />
  </div>

</div>

<style>
  /* :global(:host) block with theme variables remains unchanged */
  :global(:host) {
    /* Light Mode */
    --panel-bg: #ffffff;
    --panel-border: rgba(0, 0, 0, 0.1);
    --panel-text-primary: #0f0f0f;
    --panel-text-secondary: #606060;
    --panel-header-border: rgba(0, 0, 0, 0.1);
    --panel-subtle-bg: #f2f2f2;
  }
  @media (prefers-color-scheme: dark) {
    :global(:host) {
      /* Dark Mode */
      --panel-bg: #212121;
      --panel-border: rgba(255, 255, 255, 0.2);
      --panel-text-primary: #ffffff;
      --panel-text-secondary: #aaaaaa;
      --panel-header-border: rgba(255, 255, 255, 0.2);
      --panel-subtle-bg: #383838;
    }
  }

  /* --- Main Panel Shell (MODIFIED) --- */
  .tubetutor-panel {
    display: flex;
    flex-direction: column;
    height: 100vh; /* Make the panel fill the entire iframe viewport height */
    width: 100%;
    /* The body now provides the background, so this can be transparent */
    background-color: transparent;
  }

  /* --- Header --- */
  .panel-header {
    display: flex;
    align-items: center;
    padding: 0 16px;
    height: 48px;
    border-bottom: 1px solid var(--panel-header-border);
    flex-shrink: 0;
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
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--panel-text-secondary);
    background-color: transparent;
    border: none;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 2px solid transparent; /* Inactive state */
    margin-bottom: -1px; /* Overlaps the container border */
  }
  .tab-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  /* The 'active' class is dynamically applied by Svelte */
  .tab-button.active {
    color: var(--panel-text-primary);
    border-bottom-color: var(--panel-text-primary);
  }

  /* --- Content Area --- */
  .content-area {
    flex-grow: 1; /* Takes up all remaining space */
    overflow-y: auto; /* Content will scroll if it's too long */
  }
</style>