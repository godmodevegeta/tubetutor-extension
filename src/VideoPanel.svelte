<!-- File: src/VideoPanel.svelte (The Main Application Shell) -->

<script>
  import NotesView from './NotesView.svelte';
  import QuizView from './QuizView.svelte';
  import ChatView from './ChatView.svelte';

  // This script runs inside the iframe, which has access to chrome.* APIs.
  // We can get the videoId from the iframe's own URL query parameters.
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('videoId');

  let activeView = 'Notes';
  const views = { Notes: NotesView, Quiz: QuizView, Chat: ChatView };

  // Note: We can add transcript fetching logic back here later,
  // calling chrome.runtime.sendMessage directly. It will work flawlessly.
</script>

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
    <svelte:component this={views[activeView]} />
  </div>

</div>

<!-- Note: The style section is now part of the component again.
     The manual injection in injectVideoPanel.js will need to be updated. -->
<style>
  /* --- Main Panel Shell --- */
  .tubetutor-panel {
    display: flex;
    flex-direction: column;
    /* We are removing fixed height to allow the content to determine the size */
    min-height: 400px;
    width: 402px;
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