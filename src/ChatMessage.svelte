<!-- File: src/ChatMessage.svelte -->
<script>
  export let role; // 'user' or 'assistant'
  export let content;
</script>

<div class="message" class:user={role === 'user'} class:assistant={role === 'assistant'}>
  <strong class="role">{role === 'user' ? 'You' : 'Maddie'}:</strong>
  <div class="content">{@html content}</div>
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
    white-space: pre-wrap;
  }
</style>