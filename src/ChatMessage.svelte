<!-- File: src/ChatMessage.svelte -->
<script>
  import { parseAndSanitize } from './markdown.js';

  export let role; // 'user' or 'assistant'
  export let content;
  // This is a "reactive declaration". Whenever the 'content' prop changes
  // (e.g., during streaming), this line will automatically re-run.
  $: sanitizedContent = parseAndSanitize(content);
</script>

<div class="message" class:user={role === 'user'} class:assistant={role === 'assistant'}>
  <strong class="role">{role === 'user' ? 'You' : 'Maddie'}:</strong>
  <div class="content">{@html sanitizedContent}</div>
</div>

<style>
  .message {
    padding: 12px 16px;
    border-bottom: 1px solid var(--panel-header-border);
  }
  .role {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--panel-text-secondary);
  }
  .user .role { color: #3ea6ff; } /* Give user a distinct color */
  .content {
    line-height: 1.6;
  }
  /* We use :global() because these elements are injected by {@html} */
  .content :global(ul) {
    padding-inline-start: 20px; /* Indent the list */
    margin-block-start: 0.5em;
    margin-block-end: 0.5em;
  }

  .content :global(li) {
    margin-bottom: 4px; /* Space between list items */
  }

  .content :global(strong) {
    font-weight: 500;
    color: var(--panel-text-primary);
  }
</style>