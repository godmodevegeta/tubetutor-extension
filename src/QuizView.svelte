<!-- File: src/QuizView.svelte -->

<script>
  import { onMount } from 'svelte';
  import Question from './Question.svelte';
  import { chatCommand } from './stores.js';

  const videoId = new URLSearchParams(window.location.search).get('videoId');

  // This prop will be passed down from VideoPanel
  export let onNavigate;

  // Our State Machine
  let state = 'idle'; // 'idle' | 'generating' | 'answering' | 'graded'
  let quiz = null;
  let userAnswers = [];
  let score = 0;
  let errorMessage = '';

  // Load saved state when component mounts
  onMount(() => {
    chrome.storage.local.get(videoId, (res) => {
      const saved = res[videoId];
      if (saved && saved.state) {
        console.log('[QuizView] Restoring saved state:', saved.state);
        state = saved.state;
        quiz = saved.quiz || null;
        userAnswers = saved.userAnswers || [];
        score = saved.score || 0;
        errorMessage = '';
      }
    });

    // Listen for async background updates (AI generation complete)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[videoId]) {
        const newData = changes[videoId].newValue;
        if (!newData) return;
        console.log('[QuizView] Storage updated → syncing UI state:', newData.state);
        state = newData.state || state;
        quiz = newData.quiz || quiz;
        userAnswers = newData.userAnswers || userAnswers;
        score = newData.score || score;
      }
    });
  });


  function generateQuiz(forceNew = false) {
    if (state === 'generating') return; // prevent parallel requests
    state = 'generating';
    errorMessage = '';
    console.log(`[QuizView] Requesting AI quiz. Force new: ${forceNew}`);
    // Persist spinner state immediately
    chrome.storage.local.set({
      [videoId]: { state: 'generating' }
    });
    
    let timer = setTimeout(() => {
      if (state === 'generating') {
        errorMessage = "Quiz generation timed out.";
        state = 'idle';
        chrome.storage.local.set({ [videoId]: { state } });
      }
    }, 120000);
    chrome.runtime.sendMessage(
      { type: 'GET_QUIZ', payload: { videoId, forceNew } },
      (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          errorMessage = chrome.runtime.lastError.message;
          state = 'idle';
          chrome.storage.local.set({ [videoId]: { state, errorMessage } });

          return;
        }
        if (response?.success && response.quiz && Array.isArray(response.quiz.questions)) {
          quiz = response.quiz;
          console.log('[QuizView] Received valid quiz data:', quiz);
          userAnswers = new Array(quiz.questions.length).fill(null);
          state = 'answering';
          // Save quiz to persistent storage
          chrome.storage.local.set({
            [videoId]: { state, quiz, userAnswers }
          });
        } else {
          // If the data is malformed for any reason, we fail gracefully.
          errorMessage = response?.error || "Failed to load a valid quiz.";
          console.log('[QuizView] Received invalid quiz response:', response);
          state = 'idle'; // Go back to the safe 'idle' state.
          chrome.storage.local.set({ [videoId]: { state, errorMessage } });
        }
      }
    );
  }

  function handleSubmit() {
    if (!quiz?.questions?.length) return;
    let correctCount = 0;
    for (let i = 0; i < quiz.questions.length; i++) {
      if (userAnswers[i] === quiz.questions[i].correctAnswerIndex) {
        correctCount++;
      }
    }
    score = Math.round((correctCount / quiz.questions.length) * 100);
    state = 'graded';
    // Persist graded state & score
    chrome.storage.local.set({
      [videoId]: { state, quiz, userAnswers, score }
    });
  }
  
  function handleRetry() {
    chrome.storage.local.remove(videoId, () => generateQuiz(true));
  }
  function handleAskWhy(questionData, userAnswerIndex) {
    const command = {
      type: 'ASK_WHY',
      context: {
        question: questionData.question,
        options: questionData.options,
        userAnswer: questionData.options[userAnswerIndex],
        correctAnswer: questionData.options[questionData.correctAnswerIndex]
      }
    };
    // 1. Set the command in the store
    chatCommand.set(command);
    // 2. Tell the parent panel to switch tabs
    onNavigate('Chat');
  }
</script>

<div class="view-container">
  {#if state === 'idle'}
    <div class="idle-view">
      <p>Ready to test your knowledge?</p>
      <button class="action-button" on:click={() => generateQuiz()}>Attempt Quiz</button>
      {#if errorMessage}
        <p class="error-text">{errorMessage}</p>
      {/if}
    </div>

  {:else if state === 'generating'}
    <div class="status-view">
      <p>Generating your personalized quiz with on-device AI...</p>
      <p>May take upto 2-3 minutes</p>
      <div class="spinner"></div>
    </div>

  {:else if state === 'answering' || state === 'graded'}
    <div class="quiz-form">
      {#each quiz.questions as questionData, i}
        <Question 
          {questionData} 
          questionIndex={i}
          isGraded={state === 'graded'}
          bind:userAnswer={userAnswers[i]}
          on:askwhy={() => handleAskWhy(questionData, userAnswers[i])}
        />
      {/each}
    </div>
    
    <div class="footer">
      {#if state === 'answering'}
        <button class="action-button" on:click={handleSubmit}>Submit</button>
      {:else if state === 'graded'}
        <span class="score-text">Your Score: {score.toFixed(0)}%</span>
        <button class="action-button retry" on:click={handleRetry}>Retry with New Questions</button>
      {/if}
    </div>
  {/if}
</div>

<style>

  /* --- ENHANCEMENT: ADDED A CSS SPINNER --- */
  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--panel-header-border);
    border-top-color: var(--panel-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
    margin: 0 auto;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .view-container { padding: 0; }
  .idle-view, .status-view {
    padding: 24px;
    text-align: center;
  }
  .error-text { color: #ff4d4d; margin-top: 16px; }
  .action-button {
    background-color: var(--panel-text-primary);
    color: var(--panel-bg);
    border: none;
    border-radius: 18px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .footer {
    padding: 10px;
    border-top: 1px solid var(--panel-header-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--panel-bg);
    position: sticky;
    bottom: 0;
  }
  .score-text { font-weight: 500; }
  .action-button.retry {
    background-color: var(--panel-subtle-bg);
    color: var(--panel-text-primary);
  }
</style>