<!-- File: src/Question.svelte -->

<script>
  export let questionData; // The question object from our JSON schema
  export let questionIndex; // The index (e.g., "1.", "2.")
  export let isGraded = false; // Is the quiz in the "graded" state?
  export let userAnswer = null; // The user's selected answer index

  // Derived properties to check correctness
  $: isCorrect = userAnswer === questionData.correctAnswerIndex;
  $: isIncorrect = isGraded && !isCorrect;
</script>

<div class="question-container" class:incorrect={isIncorrect}>
  <p class="question-text"><strong>{questionIndex + 1}.</strong> {questionData.question}</p>
  
  <div class="options">
    {#each questionData.options as option, i}
      <label 
        class="option-label" 
        class:correct={isGraded && i === questionData.correctAnswerIndex}
        class:wrong-selection={isIncorrect && i === userAnswer}
      >
        <input 
          type="radio" 
          name="question-{questionIndex}" 
          value={i}
          bind:group={userAnswer}
          disabled={isGraded}
        />
        {option}
      </label>
    {/each}
  </div>

  {#if isIncorrect}
    <p class="correct-answer-text">
      Correct answer: {questionData.options[questionData.correctAnswerIndex]}
    </p>
  {/if}
</div>

<style>
  .question-container {
    padding: 16px;
    border-bottom: 1px solid var(--panel-header-border);
  }
  .question-container.incorrect {
    background-color: rgba(255, 77, 77, 0.1); /* Subtle red for incorrect */
    border-color: rgba(255, 77, 77, 0.3);
  }
  .question-text { margin: 0 0 12px 0; line-height: 1.5; }
  .options { display: flex; flex-direction: column; gap: 8px; }
  .option-label {
    display: block;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid var(--panel-header-border);
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .option-label:hover { background-color: var(--panel-subtle-bg); }
  .option-label input { margin-right: 10px; }
  .option-label.correct {
    background-color: rgba(0, 200, 83, 0.15);
    border-color: rgba(0, 200, 83, 0.4);
  }
  .option-label.wrong-selection {
    text-decoration: line-through;
    opacity: 0.8;
  }
  .correct-answer-text {
    margin: 12px 0 0 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--panel-text-primary);
  }
</style>