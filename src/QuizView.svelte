<!-- File: src/QuizView.svelte -->

<script>
  import { onMount } from 'svelte';
  import Question from './Question.svelte';

  const videoId = new URLSearchParams(window.location.search).get('videoId');

  // Our State Machine
  let state = 'idle'; // 'idle' | 'generating' | 'answering' | 'graded'
  let quiz = null;
  let userAnswers = [];
  let score = 0;
  let errorMessage = '';

  function generateQuiz(forceNew = false) {
    state = 'generating';
    errorMessage = '';
    console.log(`[QuizView] Requesting AI quiz. Force new: ${forceNew}`);
    
    chrome.runtime.sendMessage(
      { type: 'GET_QUIZ', payload: { videoId, forceNew } },
      (response) => {
        if (response?.success) {
          quiz = response.quiz;
          userAnswers = new Array(quiz.questions.length).fill(null);
          state = 'answering';
        } else {
          errorMessage = response?.error || "An unknown error occurred.";
          state = 'idle'; // Go back to idle on failure
        }
      }
    );
  }

  function handleSubmit() {
    let correctCount = 0;
    for (let i = 0; i < quiz.questions.length; i++) {
      if (userAnswers[i] === quiz.questions[i].correctAnswerIndex) {
        correctCount++;
      }
    }
    score = (correctCount / quiz.questions.length) * 100;
    state = 'graded';
  }
  
  function handleRetry() {
    generateQuiz(true); // 'true' tells the background to fetch a new quiz
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
      <!-- You could add a CSS spinner here -->
    </div>

  {:else if state === 'answering' || state === 'graded'}
    <div class="quiz-form">
      {#each quiz.questions as questionData, i}
        <Question 
          {questionData} 
          questionIndex={i}
          isGraded={state === 'graded'}
          bind:userAnswer={userAnswers[i]}
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
    padding: 16px;
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