console.log('[TubeTutor] Content script loaded!');

function handleVideoPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  const playlistId = urlParams.get('list');

  // If the URL doesn't have a video and a playlist, do nothing
  if (!videoId || !playlistId) {
    return;
  }

  // Ask the background script if this video is part of an enrolled course
  chrome.runtime.sendMessage(
    {
      type: 'CHECK_VIDEO_STATUS',
      payload: { videoId, playlistId }
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking video status:', chrome.runtime.lastError.message);
        return;
      }
      
      if (response.isEnrolled) {
        console.log('[TubeTutor] This video is part of an enrolled course. Injecting panel.');
        injectVideoPanel();
      }
    }
  );
}
// This function creates and injects our new panel
// This function creates and injects our new panel
function injectVideoPanel() {
  // Check if our panel already exists
  if (document.getElementById('tubetutor-video-panel')) {
    return;
  }

  // --- THE FIX IS HERE ---

  // 1. The parent container is still correct.
  const parentContainer = document.querySelector('#panels');
  
  // 2. We find the DIRECT CHILD of #panels that we want to insert our panel BEFORE.
  // This is the correct reference node.
  const referenceNode = document.querySelector('#panels > ytd-engagement-panel-section-list-renderer');
  
  // 3. We check for BOTH the parent and the reference node before proceeding.
  if (parentContainer && referenceNode) {
    const ourPanel = document.createElement('div');
    ourPanel.id = 'tubetutor-video-panel';
    ourPanel.innerHTML = '<h1>Hi from TubeTutor!</h1>';

    // Style the panel (same as before)
    ourPanel.style.backgroundColor = 'var(--yt-spec-brand-background-solid)'; // Use YT variable
    ourPanel.style.border = '1px solid var(--yt-spec-10-percent-layer)'; // Use YT variable
    ourPanel.style.padding = '16px';
    ourPanel.style.marginBottom = '16px';
    ourPanel.style.borderRadius = '12px';
    ourPanel.style.color = 'var(--yt-spec-text-primary)'; // Use YT variable

    // 4. Execute the CORRECT insertion command.
    parentContainer.insertBefore(ourPanel, referenceNode);
    console.log('[TubeTutor] Video panel successfully injected.');
    
  } else {
    // Add a more descriptive error for future debugging
    console.error('[TubeTutor] Could not find the parent container or reference node for video panel injection.');
  }
}

function scrapePlaylistData() {
  const videos = [];
  // This selector targets each video row in the playlist view
  const videoRenderers = document.querySelectorAll('ytd-playlist-video-renderer');

  videoRenderers.forEach((renderer, index) => {
    // Find the link and title elements within each video row
    const titleElement = renderer.querySelector('#video-title');
    const linkElement = renderer.querySelector('a#thumbnail');
    
    if (titleElement && linkElement) {
      const url = new URL(linkElement.href);
      const videoId = url.searchParams.get('v');
      
      videos.push({
        videoId: videoId,
        title: titleElement.title,
        url: linkElement.href,
        index: index + 1, // Store the 1-based index
        watched: false // We'll use this later
      });
    }
  });
  
  console.log('[TubeTutor] Scraped videos:', videos);
  return videos;
}

function addEnrollButton() {
  const isPlaylistPage = window.location.href.includes("youtube.com/playlist?list=");
  if (!isPlaylistPage) return;

  // The selector might change, but this is our current best guess
  const targetContainer = document.querySelector('.ytFlexibleActionsViewModelActionRow');
  
  // Exit if we can't find the container or if the button is already there
  if (!targetContainer || document.getElementById('tubetutor-enroll-btn')) {
    return;
  }
  
  const playlistId = new URLSearchParams(window.location.search).get('list');

  // --- NEW LOGIC: ASK THE BACKGROUND SCRIPT FOR THE STATUS FIRST ---
  chrome.runtime.sendMessage(
    {
      type: 'CHECK_ENROLLMENT_STATUS',
      payload: { playlistId }
    },
    (response) => {
      // This callback function runs AFTER the background script sends a response
      
      // Safety check in case the background script is not ready
      if (chrome.runtime.lastError) {
        console.error('Error checking enrollment status:', chrome.runtime.lastError.message);
        return;
      }
      
      console.log('[TubeTutor] Received enrollment status:', response.isEnrolled);
      createAndAppendButton(targetContainer, playlistId, response.isEnrolled);
    }
  );
}

// --- HELPER FUNCTION: To create and style the button ---
// This avoids code duplication and keeps our logic clean.
function createAndAppendButton(targetContainer, playlistId, isAlreadyEnrolled) {
    const enrollButton = document.createElement('button');
    enrollButton.id = 'tubetutor-enroll-btn';

    const nativeStyles = {
        height: '36px', borderRadius: '18px', border: 'none', padding: '0 16px',
        marginLeft: '8px', flexShrink: '0', fontFamily: '"Roboto","Arial",sans-serif',
        fontSize: '14px', fontWeight: '500', textTransform: 'uppercase',
        color: 'var(--yt-spec-text-primary)', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
    };
    Object.assign(enrollButton.style, nativeStyles);

    if (isAlreadyEnrolled) {
        // --- ENROLLED STATE ---
        enrollButton.innerText = 'Enrolled';
        enrollButton.disabled = true;
        enrollButton.style.backgroundColor = 'var(--yt-spec-text-disabled)';
        enrollButton.style.color = 'var(--yt-spec-general-background-a)';
    } else {
        // --- UNENROLLED (DEFAULT) STATE ---
        enrollButton.innerText = 'Enroll';
        enrollButton.disabled = false;
        enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-secondary)';
        
        // Add hover effects only for the active button
        enrollButton.addEventListener('mouseenter', () => {
          if (enrollButton.disabled) return;
          enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-primary)';
        });
        enrollButton.addEventListener('mouseleave', () => {
          if (enrollButton.disabled) return;
          enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-secondary)';
        });

        // Add the click listener to enroll the course
        enrollButton.addEventListener('click', () => {
            console.log('[TubeTutor] Enroll button clicked!');
            const playlistTitle = document.querySelector('#title .yt-formatted-string')?.textContent || 'Untitled Playlist';
            
            // Scrape the video data BEFORE sending the message
            const videos = scrapePlaylistData();

            chrome.runtime.sendMessage({
                type: 'ENROLL_COURSE',
                payload: { 
                  playlistId, 
                  title: playlistTitle,
                  videos: videos // Send the full video list
                }
            });

            // Immediately update the button's state for instant feedback
            enrollButton.innerText = 'Enrolled';
            enrollButton.disabled = true;
            enrollButton.style.backgroundColor = 'var(--yt-spec-text-disabled)';
            enrollButton.style.color = 'var(--yt-spec-general-background-a)';
        });
    }

    targetContainer.appendChild(enrollButton);
    console.log('[TubeTutor] Button added to page in state:', isAlreadyEnrolled ? 'Enrolled' : 'Enroll');
}


// This function decides what to do based on the current page
function run() {
  const url = window.location.href;
  if (url.includes('/playlist?list=')) {
    addEnrollButton();
  } else if (url.includes('/watch')) {
    handleVideoPage();
  }
}

// The navigation observer now just calls our main run function
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(run, 1000); 
  }
}).observe(document.body, { subtree: true, childList: true });

// Also run once on initial load
setTimeout(run, 1000);