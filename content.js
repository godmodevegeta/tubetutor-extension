console.log('[TubeTutor] Content script loaded!');

function addEnrollButton() {
  // 1. Check if we are on a playlist page
  const isPlaylistPage = window.location.href.includes("youtube.com/playlist?list=");
  if (!isPlaylistPage) {
    console.log('[TubeTutor] Not a playlist page. Button not added.');
    return;
  }

  // 2. Check if our button already exists to avoid duplicates
  if (document.getElementById('tubetutor-enroll-btn')) {
    console.log('[TubeTutor] Enroll button already exists.');
    return;
  }

  // 2. The selector for our target element has been updated.
    // This ID is more stable than the class names or previous IDs.
    const targetContainer = document.querySelector('.ytFlexibleActionsViewModelActionRow');
    
    // 3. Check if the target container exists and if our button is NOT already there.
    if (targetContainer && !document.getElementById('tubetutor-enroll-btn')) {
      console.log('TubeTutor: Target container found. Adding enroll button.');

    // 4. Create our button
    const enrollButton = document.createElement('button');
    enrollButton.innerText = 'Enroll';
    enrollButton.id = 'tubetutor-enroll-btn';
    
    // 5. Style the button
    // --- NEW NATIVE STYLING ---
      // This object defines the styles that mimic YouTube's native buttons
      const nativeStyles = {
        // Shape and Size
        height: '36px',
        borderRadius: '18px', // Creates the "pill" shape
        border: 'none',
        padding: '0 10px', // Vertical 0, Horizontal 16px
        marginLeft: '8px',
        
        // Typography
        fontFamily: '"Roboto","Arial",sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        textTransform: 'uppercase',

        // Colors (Using YouTube's CSS variables for automatic Light/Dark mode)
        backgroundColor: 'var(--yt-spec-brand-background-secondary)',
        color: 'var(--yt-spec-text-primary)',

        // Behavior
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };

      // Apply all the styles at once
      Object.assign(enrollButton.style, nativeStyles);

      // Add a hover effect for polish
      enrollButton.addEventListener('mouseenter', () => {
        enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-primary)';
      });
      enrollButton.addEventListener('mouseleave', () => {
        enrollButton.style.backgroundColor = 'var(--yt-spec-brand-background-secondary)';
      });
      // --- END OF NEW STYLING ---

    // 6. Define click behavior
    enrollButton.addEventListener('click', () => {
      console.log('[TubeTutor] Enroll button clicked!');
      
      chrome.runtime.sendMessage({
        type: 'ENROLL_COURSE',
        payload: {
          playlistId: new URLSearchParams(window.location.search).get('list'),
          title: "Test Course Title - Will be replaced later"
        }
      });

      enrollButton.innerText = 'Enrolled!';
      enrollButton.disabled = true;
      enrollButton.style.backgroundColor = '#9E9E9E';
    });

    // 7. Add the button to the page
    targetContainer.appendChild(enrollButton);
    console.log('[TubeTutor] Enroll button successfully added to the page.');

  } else {
    console.error('[TubeTutor] Could not find the target element to attach the button.');
  }
}

// YouTube is a Single Page App. We need to handle navigation without a full page reload.
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // URL changed, wait a moment for the page to render, then try to add the button
    setTimeout(addEnrollButton, 1000); 
  }
}).observe(document.body, { subtree: true, childList: true });

// Also run once on initial load, after a short delay
setTimeout(addEnrollButton, 1000);