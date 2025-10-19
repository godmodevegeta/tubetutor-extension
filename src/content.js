// File: content.js (The Refactored Version)

console.log('[TubeTutor] Content script loaded!');

// --- NEW IFRAME INJECTOR (Replaces handleVideoPage and injectSvelteAnchor) ---
function injectIframePanel() {
  if (document.getElementById('tubetutor-iframe-panel')) return;

  const playlistElement = document.querySelector('ytd-playlist-panel-renderer#playlist');
  
  if (playlistElement) {
    const videoId = new URLSearchParams(window.location.search).get('v');

    const iframe = document.createElement('iframe');
    iframe.id = 'tubetutor-iframe-panel';
    iframe.src = chrome.runtime.getURL(`panel.html?videoId=${videoId}`);

    // Style the iframe to be seamless and correctly positioned
    iframe.style.border = 'none';
    iframe.style.width = '402px';
    iframe.style.height = '400px';
    iframe.style.display = 'block'; // Ensures proper layout
    iframe.style.marginBottom = '16px';

    playlistElement.parentElement.insertBefore(iframe, playlistElement);
    console.log('[TubeTutor] Injected iframe panel for video:', videoId);
  }
}

// --- ALL THE CODE BELOW THIS LINE IS UNCHANGED ---
// Your existing, working code for handling the "Enroll" button is perfect
// and does not need to be modified for this change.

function scrapePlaylistData() {
  const videos = [];
  const videoRenderers = document.querySelectorAll('ytd-playlist-video-renderer');
  videoRenderers.forEach((renderer, index) => {
    const titleElement = renderer.querySelector('#video-title');
    const linkElement = renderer.querySelector('a#thumbnail');
    if (titleElement && linkElement) {
      const url = new URL(linkElement.href);
      const videoId = url.searchParams.get('v');
      videos.push({
        videoId: videoId, title: titleElement.title,
        url: linkElement.href, index: index + 1, watched: false
      });
    }
  });
  console.log('[TubeTutor] Scraped videos:', videos);
  return videos;
}

function addEnrollButton() {
  const isPlaylistPage = window.location.href.includes("youtube.com/playlist?list=");
  if (!isPlaylistPage) return;
  const targetContainer = document.querySelector('.ytFlexibleActionsViewModelActionRow') || document.querySelector('#top-level-buttons-computed');
  if (!targetContainer || document.getElementById('tubetutor-enroll-btn')) return;
  const playlistId = new URLSearchParams(window.location.search).get('list');
  chrome.runtime.sendMessage(
    { type: 'CHECK_ENROLLMENT_STATUS', payload: { playlistId } },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking enrollment status:', chrome.runtime.lastError.message);
        return;
      }
      console.log('[TubeTutor] Received enrollment status:', response.isEnrolled);
      createAndAppendButton(targetContainer, playlistId, response.isEnrolled);
    }
  );
}

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
        enrollButton.innerText = 'Enrolled';
        enrollButton.disabled = true;
        enrollButton.style.backgroundColor = 'var(--yt-spec-text-disabled)';
        enrollButton.style.color = 'var(--yt-spec-general-background-a)';
    } else {
        enrollButton.innerText = 'Enroll';
        enrollButton.disabled = false;
        enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-secondary)';
        enrollButton.addEventListener('mouseenter', () => {
          if (enrollButton.disabled) return;
          enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-primary)';
        });
        enrollButton.addEventListener('mouseleave', () => {
          if (enrollButton.disabled) return;
          enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-secondary)';
        });
        enrollButton.addEventListener('click', () => {
            console.log('[TubeTutor] Enroll button clicked!');
            const playlistTitle = document.querySelector('#title .yt-formatted-string')?.textContent || 'Untitled Playlist';
            const videos = scrapePlaylistData();
            chrome.runtime.sendMessage({
                type: 'ENROLL_COURSE',
                payload: { playlistId, title: playlistTitle, videos: videos }
            });
            enrollButton.innerText = 'Enrolled';
            enrollButton.disabled = true;
            enrollButton.style.backgroundColor = 'var(--yt-spec-text-disabled)';
            enrollButton.style.color = 'var(--yt-spec-general-background-a)';
        });
    }
    targetContainer.appendChild(enrollButton);
    console.log('[TubeTutor] Button added to page in state:', isAlreadyEnrolled ? 'Enrolled' : 'Enroll');
}

// --- UPDATED 'run' FUNCTION ---
function run() {
  const url = window.location.href;
  if (url.includes('/playlist?list=')) {
    // Playlist page logic is untouched.
    addEnrollButton();
  } else if (url.includes('/watch')) {
    // On video pages, we check enrollment and then inject the iframe.
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    const playlistId = urlParams.get('list');

    if (!videoId || !playlistId) return;

    chrome.runtime.sendMessage(
      { type: 'CHECK_VIDEO_STATUS', payload: { videoId, playlistId } },
      (response) => {
        // Only inject the panel if the user is enrolled in this course.
        if (response?.isEnrolled) {
          injectIframePanel();
        }
      }
    );
  }
}

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(run, 1000); 
  }
}).observe(document.body, { subtree: true, childList: true });

setTimeout(run, 1000);

