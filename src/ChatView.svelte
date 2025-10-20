<!-- File: src/ChatView.svelte -->
<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import ChatMessage from './ChatMessage.svelte';

  export let transcript;
  // export let transcriptError;

  const videoId = new URLSearchParams(window.location.search).get('videoId');

  // State Management
  let state = 'initializing'; // 'initializing' | 'ready' | 'processing'
  let chatHistory = [];
  let userInput = '';
  let chatContainer; // For auto-scrolling

  const initialMessage = {
    role: 'assistant',
    content: `Hi, I'm TubeTutor, your personal AI tutor. Please ask me anything about the concepts in this video!`
  };

  // --- LIFECYCLE & DATA HANDLING ---
  onMount(async () => {
    // 1. Load chat from cache
    const cachedHistory = await getFromCache(`chat_${videoId}`);
    if (cachedHistory && cachedHistory.length > 0) {
      chatHistory = cachedHistory;
    } else {
      chatHistory = [initialMessage];
    }
    state = 'ready';

    // 2. Listen for streamed chunks from background.js
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  });
  
  onDestroy(() => {
    chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
  });

  afterUpdate(() => {
    // Auto-scroll to the bottom when new messages are added
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  // --- COMMUNICATION ---
  function handleBackgroundMessage(message) {
    if (message.payload.videoId !== videoId) return; // Ignore messages for other videos

    switch (message.type) {
      case 'CHAT_CHUNK':
        // Append the new chunk to the last message in the history
        chatHistory[chatHistory.length - 1].content += message.payload.chunk;
        chatHistory = chatHistory; // Trigger Svelte reactivity
        break;
      case 'CHAT_COMPLETE':
        state = 'ready';
        saveChatToCache();
        break;
      case 'CHAT_ERROR':
        chatHistory[chatHistory.length - 1].content += `\n\n<strong style="color: #ff4d4d;">Error: ${message.payload.error}</strong>`;
        state = 'ready';
        break;
    }
  }

  function handleSend() {
    if (userInput.trim() === '' || state === 'processing') return;

    // 1. Update UI immediately
    const newUserMessage = { role: 'user', content: userInput };
    chatHistory = [...chatHistory, newUserMessage, { role: 'assistant', content: '' }]; // Add user msg and empty assistant msg
    userInput = '';
    state = 'processing';

    // 2. Send to background for processing
    chrome.runtime.sendMessage({
      type: 'CHAT_PROMPT',
      payload: { videoId, transcript, history: chatHistory.slice(0, -1) } // Send history *before* the empty assistant message
    });
  }
  
  function handleClearChat() {
    state = 'initializing';
    chrome.runtime.sendMessage({ type: 'CLEAR_CHAT', payload: { videoId } });
    chrome.storage.local.remove(`chat_${videoId}_cache`);
    chatHistory = [initialMessage];
    state = 'ready';
  }

  // --- CACHING ---
  async function getFromCache(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }
  async function saveChatToCache() {
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await chrome.storage.local.set({ [`chat_${videoId}_cache`]: chatHistory, [`chat_${videoId}_expiry`]: expiry });
  }
</script>

<div class="view-container">
  <div class="chat-log" bind:this={chatContainer}>
    {#each chatHistory as message, i}
      <ChatMessage role={message.role} content={message.content} />
    {/each}
  </div>

  <div class="input-area">
    <textarea 
      placeholder="Ask a question... (Cmd+Enter to send)"
      bind:value={userInput}
      disabled={state !== 'ready'}
      on:keydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } }}
    ></textarea>
    <button on:click={handleSend} disabled={state !== 'ready'}>Send</button>
  </div>
  
  <div class="footer">
    <button class="clear-button" on:click={handleClearChat}>Clear Chat</button>
  </div>
</div>

<style>
  .view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0;
  }
  .chat-log {
    flex-grow: 1;
    overflow-y: auto;
  }
  .input-area {
    display: flex;
    padding: 8px 16px;
    border-top: 1px solid var(--panel-header-border);
    /* Align items to the bottom as the textarea grows */
    align-items: flex-end; 
    gap: 8px; /* Add a small gap between textarea and button */
  }/* --- DYNAMIC TEXTAREA STYLING --- */
  textarea {
    flex-grow: 1;
    background: transparent;
    border: none;
    resize: none;
    color: var(--panel-text-primary);
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5; /* Match line height for accurate growth */
    padding: 8px 0; /* Add some internal vertical padding */
    margin: 0;

    /* The Magic Properties */
    field-sizing: content;
    min-height: 20px;   /* Start at a small, single-line height */
    max-height: 120px;  /* Stop growing after about 6 lines */
    overflow-y: auto;   /* Show a scrollbar when max-height is reached */
  }
  textarea:focus { outline: none; }

  /* Adjust the Send button to align nicely */
  .input-area button {
    flex-shrink: 0; /* Prevent the button from shrinking */
    height: 36px;
    padding: 0 16px;
    border-radius: 18px;
    border: none;
    background-color: var(--panel-text-primary);
    color: var(--panel-bg);
    cursor: pointer;
    font-weight: 500;
  }
  .input-area button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .footer {
    padding: 8px 16px;
    border-top: 1px solid var(--panel-header-border);
    text-align: right;
  }
  .clear-button {
    font-size: 12px;
    background: none;
    border: none;
    color: var(--panel-text-secondary);
    cursor: pointer;
  }
</style>