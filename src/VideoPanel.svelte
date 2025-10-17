<script>
  // This is the "state" of our component. It tracks which tab is currently active.
  let activeTab = 'Notes'; // Default to the 'Notes' tab

  // This function will be called when a tab is clicked
  function selectTab(tabName) {
    activeTab = tabName;
  }
</script>

<div class="tubetutor-panel">
  <!-- Header Section -->
  <header class="panel-header">
    <h2 class="title">TubeTutor</h2>
    <p class="subtitle">AI Study Assistant</p>
  </header>

  <!-- Menu Bar / Navigation -->
  <nav class="panel-nav">
    <button 
      class="nav-button" 
      class:active={activeTab === 'Notes'}
      on:click={() => selectTab('Notes')}>
      Notes
    </button>
    <button 
      class="nav-button" 
      class:active={activeTab === 'Quiz'}
      on:click={() => selectTab('Quiz')}>
      Quiz
    </button>
    <button 
      class="nav-button" 
      class:active={activeTab === 'Chat'}
      on:click={() => selectTab('Chat')}>
      Chat
    </button>
  </nav>

  <!-- Content Section (changes based on the active tab) -->
  <main class="panel-content">
    {#if activeTab === 'Notes'}
      <p>You clicked on Notes</p>
      <!-- The Transcript will go here later -->
    {:else if activeTab === 'Quiz'}
      <p>You clicked on Quiz</p>
      <!-- The AI Quiz feature will go here later -->
    {:else if activeTab === 'Chat'}
      <p>You clicked on Chat</p>
      <!-- The AI Chat feature will go here later -->
    {/if}
  </main>

</div>

<style>
  /* This CSS is scoped only to this component */
  .tubetutor-panel {
    background-color: var(--yt-spec-brand-background-solid);
    border: 1px solid var(--yt-spec-10-percent-layer);
    color: var(--yt-spec-text-primary);
    border-radius: 12px;
    margin-bottom: 16px;
    overflow: hidden; /* Ensures child borders don't poke out */
    font-family: "Roboto", "Arial", sans-serif;
  }

  .panel-header {
    padding: 16px;
    text-align: center;
    border-bottom: 1px solid var(--yt-spec-10-percent-layer);
  }

  .title {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 500;
  }

  .subtitle {
    margin: 4px 0 0;
    font-size: 1.2rem;
    color: var(--yt-spec-text-secondary);
  }

  .panel-nav {
    display: flex;
    justify-content: space-around;
    background-color: var(--yt-spec-badge-chip-background);
  }

  .nav-button {
    flex-grow: 1;
    padding: 12px 16px;
    background-color: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--yt-spec-text-secondary);
    font-size: 1.4rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
  }

  .nav-button:hover {
    background-color: var(--yt-spec-10-percent-layer);
  }

  .nav-button.active {
    color: var(--yt-spec-text-primary);
    border-bottom-color: var(--yt-spec-text-primary);
  }

  .panel-content {
    padding: 16px;
    min-height: 200px; /* Gives it some space */
    font-size: 1.4rem;
  }
</style>