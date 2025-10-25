<!-- File: src/App.svelte (Corrected Version) -->
<script>
  import { onMount } from 'svelte';
  import CourseItem from './CourseItem.svelte';

  let allCourses = [];
  let activeTab = 'In Progress';
  let isLoading = true;
  let searchTerm = '';

  onMount(() => {
    chrome.runtime.sendMessage({ type: 'GET_ALL_COURSES' }, (response) => {
      if (response?.success) {
        allCourses = response.courses;
      }
      isLoading = false;
    });
  });

  // --- DERIVED STATE (MODIFIED) ---
  // The filtering logic is now based on the 'isCompleted' property.
  $: inProgressCourses = filteredCourses.filter(c => !c.isCompleted);
  $: completedCourses = filteredCourses.filter(c => c.isCompleted);
  $: filteredCourses = allCourses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleUnenroll(event) {
    const { playlistId } = event.detail;
    allCourses = allCourses.filter(course => course.playlistId !== playlistId);
    chrome.runtime.sendMessage({ type: 'UNENROLL_COURSE', payload: { playlistId } });
  }
  // --- NEW EVENT HANDLER ---
  function handleToggleComplete(event) {
    const { playlistId, isCompleted } = event.detail;

    // 1. Optimistic UI: Find the course and update its state instantly.
    const courseIndex = allCourses.findIndex(c => c.playlistId === playlistId);
    if (courseIndex > -1) {
      allCourses[courseIndex].isCompleted = isCompleted;
      // By reassigning the array, we trigger Svelte's reactivity.
      allCourses = [...allCourses]; 
    }

    // 2. Send command to background to persist the change.
    chrome.runtime.sendMessage({
      type: 'MARK_COURSE_COMPLETED',
      payload: { playlistId, isCompleted }
    });
  }
</script>

<main>
  <div class="header">
    <div class="header-intro">
        <img src="/images/icon128.png" alt="Maddie, your AI Tutor" class="app-icon" />
        <div class="header-text">
            <h1 class="header-title">Hey there, I'm Maddie</h1>
            <p class="header-subtitle">What are we learning today?</p>
        </div>
    </div>
    <div class="search-container">
      <input type="text" placeholder="Find a course..." bind:value={searchTerm} />
    </div>
  </div>

  <div class="tab-nav">
    <button class:active={activeTab === 'In Progress'} on:click={() => activeTab = 'In Progress'}>
      In Progress ({inProgressCourses.length})
    </button>
    <button class:active={activeTab === 'Completed'} on:click={() => activeTab = 'Completed'}>
      Completed ({completedCourses.length})
    </button>
  </div>

  <div class="course-list">
    {#if isLoading}
      <p class="status-text">Loading...</p>
    {:else if activeTab === 'In Progress'}
      {#each inProgressCourses as course (course.playlistId)}
        <CourseItem {course} on:unenroll={handleUnenroll} on:toggleComplete={handleToggleComplete} />
      {:else}
        <p class="status-text">No courses in progress. Great job!</p>
      {/each}
    {:else if activeTab === 'Completed'}
      {#each completedCourses as course (course.playlistId)}
        <CourseItem {course} on:unenroll={handleUnenroll} on:toggleComplete={handleToggleComplete} />
      {:else}
        <p class="status-text">No completed courses yet.</p>
      {/each}
    {/if}
  </div>
</main>


<svelte:head>
  <style>
    /* 1. Define all theme variables on the :root. */
    :root {
      /*
        LIGHT MODE THEME (A professional, complementary theme)
        We use a clean white/grey with the green as an accent.
      */
      --panel-bg: #ffffff;
      --panel-border: #e0e0e0;
      --panel-text-primary: #0D0D0D; /* Use the dark neutral for text */
      --panel-text-secondary: #555555;
      --panel-header-border: #eeeeee;
      --panel-subtle-bg: #f5f5f5;
      --panel-accent: #323C59; /* Use the dark navy as the light-mode accent */
      --panel-accent-text: #ffffff; /* Text on top of the accent color */
    }

    @media (prefers-color-scheme: dark) {
      /*
        DARK MODE THEME (Your branded icon palette)
      */
      :root {
        --panel-bg: #0D0D0D;
        --panel-border: #323C59;
        --panel-text-primary: #F2F2F2;
        --panel-text-secondary: #EFF2F2;
        --panel-header-border: #323C59;
        --panel-subtle-bg: #1B1A40;
        --panel-accent: #A0F2B4;
        --panel-accent-text: #0D0D0D;
      }
    }

    /* 2. Apply base styles to the body (unchanged). */
    body {
      background-color: var(--panel-bg);
      color: var(--panel-text-primary);
      font-family: "Roboto", "Arial", sans-serif;
      margin: 0;
      padding: 0;
    }

    /* 3. NEW: Add a class for the icon in the header */
    .app-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px; /* Slightly rounded corners */
    }
  </style>
</svelte:head>

<style>
  /* --- MAIN LAYOUT --- */
  main {
    width: 380px;
    min-height: 200px;
    max-height: 500px;
    display: flex;
    flex-direction: column;
    
    /* These are the properties that create the visible rounded panel */
    background-color: var(--panel-bg);
    border-radius: 12px;
    overflow: hidden; /* This is essential to hide the sharp corners of child elements */
  }

  /* --- HEADER & SEARCH --- */
  .header {
    padding: 16px;
    border-bottom: 1px solid var(--panel-header-border);
    flex-shrink: 0;
  }
  .app-icon { /* This is a global style from <svelte:head>, but we can confirm it here */
    width: 36px;
    height: 36px;
    border-radius: 8px;
    flex-shrink: 0; /* Prevents the icon from being squashed */
  }
  .header-intro {
    display: flex;
    align-items: center; /* Vertically aligns the icon and the text block */
    gap: 12px; /* Space between icon and text */
    margin-bottom: 16px;
  }
  .header-text {
    display: flex;
    flex-direction: column; /* Stacks the title and subtitle vertically */
  }

  .header-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--panel-text-primary);
    margin: 0;
  }
  .header-subtitle {
    font-size: 13px;
    font-weight: 400; /* Lighter weight for the subtitle */
    color: var(--panel-text-secondary);
    margin: 2px 0 0 0; /* Fine-tune spacing */
    line-height: 1.4;
  }
  .search-container input {
    width: 100%;
    padding: 8px 12px;
    font-size: 14px;
    background-color: var(--panel-subtle-bg);
    border: 1px solid var(--panel-header-border);
    border-radius: 6px;
    color: var(--panel-text-primary);
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .search-container input:focus {
    outline: none;
    border-color: var(--panel-accent);
  }
  .search-container input::placeholder {
    color: var(--panel-text-secondary);
  }

  /* --- TAB NAVIGATION (Copied from VideoPanel for consistency) --- */
  .tab-nav {
    display: flex;
    border-bottom: 1px solid var(--panel-header-border);
    flex-shrink: 0;
  }
  .tab-nav button {
    font-size: 14px;
    font-weight: 500;
    color: var(--panel-text-secondary);
    background: none;
    border: none;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    flex-grow: 1; /* Make tabs fill the width */
  }
  .tab-nav button:hover {
    background-color: var(--panel-subtle-bg);
  }
  .tab-nav button.active {
    color: var(--panel-text-primary);
    border-bottom-color: var(--panel-accent);
  }

  /* --- LIST & STATUS --- */
  .course-list {
    flex-grow: 1;
    overflow-y: auto;
  }
  .status-text {
    padding: 32px;
    text-align: center;
    font-style: italic;
    color: var(--panel-text-secondary);
  }
</style>