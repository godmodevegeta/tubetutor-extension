<!-- File: src/ChatView.svelte -->
<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import ChatMessage from './ChatMessage.svelte';

  export let transcript;
  // export let transcriptError;

  const videoId = new URLSearchParams(window.location.search).get('videoId');
  const CACHE_KEY = `chat_history_${videoId}`; // A clear, unique key for our cache

  // State Management
  let state = 'initializing'; // 'initializing' | 'ready' | 'processing'
  let chatHistory = [];
  let userInput = '';
  let chatContainer; // For auto-scrolling

  const initialMessage = {
    role: 'assistant',
    content: `Hi, I'm TubeTutor, your personal AI tutor. Please ask me anything about the concepts in this video!`
  };

  // --- LIFECYCLE & DATA HANDLING (CORRECTED) ---
  onMount(async () => {
    // 1. ALWAYS load from cache first on mount.
    const cached = await getFromCache(CACHE_KEY);
    if (cached) {
      console.log('[ChatView] Found existing chat in cache. Loading.');
      chatHistory = cached;
    } else {
      console.log('[ChatView] No chat in cache. Initializing with welcome message.');
      chatHistory = [initialMessage];
    }
    state = 'ready';

    // 2. Add the listener for background messages (unchanged)
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  });
  
  onDestroy(() => {
    // Unchanged
    chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
  });

  afterUpdate(() => {
    // Unchanged
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  // --- COMMUNICATION (handleBackgroundMessage is unchanged) ---
  function handleBackgroundMessage(message) {
    if (message.payload.videoId !== videoId) return;

    switch (message.type) {
      case 'CHAT_CHUNK':
        chatHistory[chatHistory.length - 1].content += message.payload.chunk;
        chatHistory = chatHistory;
        break;
      case 'CHAT_COMPLETE':
        // When the stream is finished, trim the final, complete message.
        chatHistory[chatHistory.length - 1].content = chatHistory[chatHistory.length - 1].content.trim();
        state = 'ready';
        saveChatToCache(); // Persist the full history after AI is done
        break;
      case 'CHAT_ERROR':
        chatHistory[chatHistory.length - 1].content += `\n\n<strong style="color: #ff4d4d;">Error: ${message.payload.error}</strong>`;
        state = 'ready';
        saveChatToCache(); // Persist even if there's an error
        break;
    }
  }

  // --- USER ACTIONS (handleSend and handleClearChat are now cache-aware) ---
  async function handleSend() {
    if (userInput.trim() === '' || state === 'processing') return;

    const newUserMessage = { role: 'user', content: userInput };
    chatHistory = [...chatHistory, newUserMessage, { role: 'assistant', content: '' }];
    
    // Save to cache immediately after the user sends their message
    await saveChatToCache();

    userInput = '';
    state = 'processing';

    chrome.runtime.sendMessage({
      type: 'CHAT_PROMPT',
      payload: { videoId, transcript, history: chatHistory.slice(0, -1) }
    });
  }
  
  async function handleClearChat() {
    state = 'initializing';
    // Tell the background to destroy the session
    chrome.runtime.sendMessage({ type: 'CLEAR_CHAT', payload: { videoId } });
    
    // Clear the cache from storage
    await chrome.storage.local.remove(CACHE_KEY);
    
    // Reset the UI state
    chatHistory = [initialMessage];
    
    // Save the new "initial" state to the cache
    await saveChatToCache();

    state = 'ready';
    console.log('[ChatView] Chat cleared and cache reset.');
  }

  // --- CACHING HELPERS (CORRECTED) ---
  async function getFromCache(key) {
    const result = await chrome.storage.local.get([key, `${key}_expiry`]);
    const expiry = result[`${key}_expiry`];
    // Check if data exists AND if it has not expired
    if (result[key] && Date.now() < expiry) {
      return result[key];
    }
    return null; // Return null if expired or not found
  }

  async function saveChatToCache() {
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7-day TTL
    await chrome.storage.local.set({
      [CACHE_KEY]: chatHistory,
      [`${CACHE_KEY}_expiry`]: expiry
    });
    console.log('[ChatView] Chat history saved to cache.');
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