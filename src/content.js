// File: content.js (The Refactored Version)

console.log('[TubeTutor] Content script loaded!');
let playerResizeObserver = null;

// --- NEW TEARDOWN FUNCTION ---
function unmountIframePanel() {
  const iframePanel = document.getElementById('tubetutor-iframe-panel');
  if (iframePanel) {
    iframePanel.remove();
    console.log('[TubeTutor] Unmounted stale iframe panel.');
  }
  // CRITICAL: Disconnect the observer to prevent memory leaks
  if (playerResizeObserver) {
    playerResizeObserver.disconnect();
    playerResizeObserver = null;
    console.log('[TubeTutor] Disconnected player resize observer.');
  }
}

// --- NEW IFRAME INJECTOR (Replaces handleVideoPage and injectSvelteAnchor) ---
function injectIframePanel() {
  if (document.getElementById('tubetutor-iframe-panel')) return;

  const playlistElement = document.querySelector('ytd-playlist-panel-renderer#playlist');
  const playerElement = document.querySelector('ytd-player'); // The main video player

  
  if (playlistElement) {
    const videoId = new URLSearchParams(window.location.search).get('v');

    const iframe = document.createElement('iframe');
    iframe.id = 'tubetutor-iframe-panel';
    iframe.src = chrome.runtime.getURL(`panel.html?videoId=${videoId}`);

    // --- NEW HIGH-FIDELITY STYLING FOR THE IFRAME ---
    iframe.style.cssText = `
      /* Box Model */
      display: block;
      width: 100%; /* Take up the full width of the parent column */
      // height: 450px;
      margin-bottom: 16px; /* Space between our panel and the playlist */

      /* Borders & Appearance */
      border-radius: 12px;
      border: 1px solid var(--yt-spec-10-percent-layer);
      background-color: var(--yt-spec-brand-background-solid);

      /* No internal scrollbars on the iframe itself */
      overflow: hidden;
    `;

    // The function that syncs the height
    const syncHeight = () => {
      const playerHeight = playerElement.getBoundingClientRect().height;
      if (playerHeight > 0) {
        iframe.style.height = `${playerHeight}px`;
      }
    };
    
    // Create and start the observer
    playerResizeObserver = new ResizeObserver(syncHeight);
    playerResizeObserver.observe(playerElement);
    
    // Perform the initial sync
    syncHeight();

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
            // 1. Scrape the main title from the H1 tag for stability.
            const titleElement = document.querySelector('h1#title .yt-formatted-string');
            const playlistTitle = titleElement ? titleElement.textContent.trim() : 'Untitled Playlist';

            let creatorName = '';

            // 1. Primary Attempt: Use the aria-label from the avatar stack.
            const avatarStackElement = document.querySelector('yt-avatar-stack-view-model[aria-label]');
            if (avatarStackElement) {
                const ariaLabel = avatarStackElement.getAttribute('aria-label');
                // Clean the text: "by WilliamFiset" -> "WilliamFiset"
                if (ariaLabel) {
                    creatorName = ariaLabel.trim().replace(/^by\s/i, '');
                }
            }

            // 2. Secondary (Fallback) Attempt: If the primary fails, try the simple link.
            if (!creatorName) {
                const ownerLinkElement = document.querySelector('#owner-text a');
                if (ownerLinkElement) {
                    creatorName = ownerLinkElement.textContent.trim();
                }
            }
            const fullTitle = creatorName ? `${playlistTitle} by ${creatorName}` : playlistTitle;
            console.log(`[TubeTutor] Fulltitle: ${fullTitle}`);
            const videos = scrapePlaylistData();
            const thumbnailElement = document.querySelector('.yt-page-header-view-model__page-header-headline-image-hero-container img');
            console.log('[TubeTutor] Thumbnail element:', thumbnailElement);
            const thumbnailUrl = thumbnailElement ? thumbnailElement.src : '';
            if (!thumbnailUrl) {
                console.warn('[TubeTutor] Could not find playlist thumbnail image.');
            }
            console.log(`[TubeTutor] thumbnail URL: ${thumbnailUrl}`);
            const url = window.location.href;
            console.log(`[TubeTutor] playlist URL: ${url}`)
            chrome.runtime.sendMessage({
                type: 'ENROLL_COURSE',
                payload: { 
                  playlistId, 
                  title: fullTitle, 
                  videos: videos,  
                  thumbnailUrl: thumbnailUrl,
                  url: url
                }
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
    // 1. TEARDOWN FIRST: Always attempt to remove the old panel on any navigation.
  unmountIframePanel();

    // 2. SETUP SECOND: Decide whether to build a new panel for the current page.
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

// This is our new Theme Relay. It listens for requests from the iframe.
window.addEventListener('message', (event) => {
  // Security: Only accept messages from our own iframe
  if (event.source !== document.getElementById('tubetutor-iframe-panel')?.contentWindow) {
    return;
  }

  const { type, source } = event.data;

  // If the iframe is ready and asking for the theme...
  if (source === 'tubetutor-iframe' && type === 'REQUEST_THEME') {
    console.log('[Content Script] Iframe is requesting theme. Spying on host page...');

    // Get the computed styles from the main YouTube page body
    const bodyStyles = window.getComputedStyle(document.body);

    // Extract the specific colors we need
    const theme = {
      background: bodyStyles.getPropertyValue('--yt-spec-brand-background-solid').trim(),
      primaryText: bodyStyles.getPropertyValue('--yt-spec-text-primary').trim(),
      secondaryText: bodyStyles.getPropertyValue('--yt-spec-text-secondary').trim(),
      border: bodyStyles.getPropertyValue('--yt-spec-10-percent-layer').trim(),
    };
    
    // Send the theme object back to the iframe
    event.source.postMessage({
      type: 'THEME_RESPONSE',
      source: 'tubetutor-content-script',
      payload: theme
    }, '*');
  }
});