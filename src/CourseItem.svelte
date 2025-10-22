<!-- File: src/svelte-app/CourseItem.svelte ("Command Center" Version) -->
<script>
  import { createEventDispatcher } from 'svelte';
  export let course;
  const dispatch = createEventDispatcher();

  function handleUnenroll(event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(`Un-enroll from "${course.title}"?`)) {
      dispatch('unenroll', { playlistId: course.playlistId });
    }
  }
  function handleToggleComplete(event) {
    event.preventDefault();
    event.stopPropagation();
    // Dispatch an event to the parent, sending the new desired state
    dispatch('toggleComplete', { 
      playlistId: course.playlistId, 
      isCompleted: !course.isCompleted 
    });
  }
</script>

<a href={course.url} target="_blank" rel="noopener noreferrer" class="course-item" title={course.title}>
    <button 
    class="completion-button" 
    title={course.isCompleted ? 'Mark as In-Progress' : 'Mark as Completed'}
    on:click={handleToggleComplete}
  >
    <div class="checkmark-icon">
      {#if course.isCompleted}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      {/if}
    </div>
  </button>
  <div class="thumbnail" style="background-image: url({course.thumbnailUrl})"></div>

  <div class="course-info">
    <span class="course-title">{course.title}</span>
    <span class="course-video-count">{course.videos?.length || 0} videos</span>
  </div>

  <button class="unenroll-button" title="Un-enroll" on:click={handleUnenroll}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  </button>
</a>

<style>
  .course-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--panel-header-border);
    transition: background-color 0.2s, opacity 0.3s;
    cursor: pointer;
    text-decoration: none;
  }
  .course-item:hover {
    background-color: var(--panel-subtle-bg);
  }

  /* Style for completed items */
  .course-item.completed {
    opacity: 0.7;
  }
  .course-item.completed:hover {
    opacity: 1;
  }
  .course-item.completed .course-title {
    text-decoration: line-through;
  }
  
  /* Completion Button */
  .completion-button {
    background: none;
    border: 2px solid var(--panel-header-border);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s;
  }
  .completion-button:hover {
    border-color: var(--panel-text-secondary);
  }
  .checkmark-icon {
    color: var(--panel-accent-blue);
  }
  .course-item.completed .completion-button {
    border-color: var(--panel-accent-blue);
    background-color: var(--panel-accent-blue);
  }
  .course-item.completed .checkmark-icon {
    color: var(--panel-bg); /* Checkmark color is the background color when filled */
  }

  /* Thumbnail */
  .thumbnail {
    width: 64px; /* Slightly larger for better visual */
    height: 36px;
    flex-shrink: 0;
    border-radius: 4px;
    background-color: var(--panel-header-border);
    background-size: cover;
    background-position: center;
  }

  /* Course Info */
  .course-info {
    flex-grow: 1;
    min-width: 0;
  }
  .course-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--panel-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .course-video-count {
    font-size: 12px;
    color: var(--panel-text-secondary);
    display: block;
  }

  /* Un-enroll Button */
  .unenroll-button {
    background: none;
    border: none;
    color: var(--panel-text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s, background-color 0.2s;
  }
  .course-item:hover .unenroll-button {
    opacity: 1;
  }
  .unenroll-button:hover {
    background-color: var(--panel-header-border);
    color: var(--panel-text-primary);
  }
</style>