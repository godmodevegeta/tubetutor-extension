console.log('[TubeTutor] Content script loaded!');

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
          enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-primary)';
        });
        enrollButton.addEventListener('mouseleave', () => {
          enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-secondary)';
        });

        // Add the click listener to enroll the course
        enrollButton.addEventListener('click', () => {
            console.log('[TubeTutor] Enroll button clicked!');
            const playlistTitle = document.querySelector('#title .yt-formatted-string').textContent;
            
            chrome.runtime.sendMessage({
                type: 'ENROLL_COURSE',
                payload: { playlistId, title: playlistTitle }
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


// --- The navigation observer remains the same ---
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(addEnrollButton, 1000); 
  }
}).observe(document.body, { subtree: true, childList: true });

// Also run once on initial load
setTimeout(addEnrollButton, 1000);