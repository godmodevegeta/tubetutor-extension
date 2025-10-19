<!-- File: src/NotesView.svelte -->
<script>
  import { onMount } from 'svelte';

  // Get the videoId from the parent iframe's URL
  const videoId = new URLSearchParams(window.location.search).get('videoId');

  let notes = '';
  let isLoading = true;
  let errorMessage = '';

  onMount(() => {
    if (!chrome.runtime) {
      errorMessage = "This component must run within a Chrome extension.";
      isLoading = false;
      return;
    }

    console.log('[NotesView] Requesting AI notes from background script...');
    chrome.runtime.sendMessage(
      { type: 'GET_NOTES', payload: { videoId } },
      (response) => {
        isLoading = false;
        if (response?.success) {
          notes = response.notes;
        } else {
          errorMessage = response?.error || "An unknown error occurred.";
        }
      }
    );
  });

  // Enhanced helper to format summarizer notes as a proper HTML list
function formatNotes(text) {
  if (!text || typeof text !== 'string') return ''; // Safety check

  // Split into lines and trim/filter empties
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Detect bullet lines (markdown-style: * , - , or + followed by space)
  const bulletLines = lines.filter(line => {
    return /^\s*[*-+]\s+/.test(line); // Matches * Item, - Item, + Item
  });

  if (bulletLines.length === 0) {
    // No bullets? Return as simple <p> with line breaks
    return `<p>${text.replace(/\n/g, '<br>')}</p>`;
  }

  // Extract content after bullet and convert basic markdown (bold/italic)
  const items = bulletLines.map(line => {
    let content = line.replace(/^\s*[*-+]\s+/, '').trim(); // Strip bullet prefix

    // Simple markdown to HTML: **bold** → <strong>bold</strong>, *italic* → <em>italic</em>
    content = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic (non-greedy match)

    return `<li>${content}</li>`;
  });

  return `<ul>${items.join('')}</ul>`;
}
</script>

<div class="view-container">
  {#if isLoading}
    <p class="status-text">Generating mindful notes with on-device AI...</p>
  {:else if errorMessage}
    <p class="status-text error">{errorMessage}</p>
  {:else if notes}
    <div class="notes-content">
      {@html formatNotes(notes)}
      <!-- {@html notes} -->
    </div>
  {:else}
    <p class="status-text">No notes could be generated for this video.</p>
  {/if}
</div>

<style>
  .view-container {
    /* Padding is inherited from the parent content-area for consistency.
       We remove the default padding here. */
    padding: 0; 
  }

  .status-text {
    padding: 16px; /* Add padding back for status messages */
    font-style: italic;
    color: var(--panel-text-secondary);
  }

  .status-text.error {
    color: #ff4d4d; /* A slightly softer red for dark mode compatibility */
  }
  
  /* --- High-Fidelity Notes Styling --- */
  
  /* This selector targets the <ul> element created by our formatNotes function.
     We use :global() because the element is injected via @html. */
  .notes-content :global(ul) {
    list-style: none; /* Remove default browser bullet points */
    padding: 0;
    margin: 0;
  }

  .notes-content :global(li) {
    /* Layout and Spacing */
    padding: 12px 16px;
    border-bottom: 1px solid var(--panel-header-border); /* Use the same border color as our headers */
    
    /* Typography */
    font-size: 14px;
    line-height: 1.6;
    color: var(--panel-text-primary);
  }

  /* Add a hover effect to list items for better interactivity */
  .notes-content :global(li:hover) {
    background-color: var(--panel-subtle-bg);
  }

  /* Remove the border from the very last list item */
  .notes-content :global(li:last-child) {
    border-bottom: none;
  }
  
  /* Styling for bold and italic text from our markdown converter */
  .notes-content :global(strong) {
    font-weight: 500;
    color: var(--panel-text-primary);
  }
  .notes-content :global(em) {
    font-style: italic;
    color: var(--panel-text-secondary);
  }

  /* Styling for simple paragraphs if no bullets were found */
  .notes-content :global(p) {
    padding: 16px;
    margin: 0;
    line-height: 1.8;
  }
</style>