console.log('TubeTutor Background Script Loaded!');
// --- 1. UTILITY AND CACHING LOGIC ---

// Helper to get cached data
async function getFromCache(key, videoId) {
    const cacheKey = `${key}_cache`;
    const result = await chrome.storage.local.get(cacheKey);
    const cache = result[cacheKey] || {};
    const entry = cache[videoId];

    if (entry && Date.now() < entry.expiry) {
        return entry.data; // Return the data if it's not expired
    }
    return null; // Return null if not found or expired
}

// Helper to set cached data
async function setInCache(key, videoId, data) {
    const cacheKey = `${key}_cache`;
    const result = await chrome.storage.local.get(cacheKey);
    const cache = result[cacheKey] || {};
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    cache[videoId] = { data, expiry };
    await chrome.storage.local.set({ [cacheKey]: cache });
}

// --- 2. TRANSCRIPT FETCHER (NOW WITH CACHING) ---

async function getTranscript(videoId) {
    // First, try to get the transcript from cache
    const cachedTranscript = await getFromCache('transcript', videoId);
    if (cachedTranscript) {
        console.log(`[TubeTutor] Transcript for ${videoId} found in cache.`);
        return { success: true, transcript: cachedTranscript };
    }

    console.log(`[TubeTutor] Transcript for ${videoId} not in cache. Fetching from API.`);
    const TACTIQ_API_URL = 'https://tactiq-apps-prod.tactiq.io/transcript';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        const response = await fetch(TACTIQ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl, langCode: 'en' })
        });
        if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
        const data = await response.json();
        if (!data.captions || data.captions.length === 0) {
            throw new Error("API returned no captions.");
        }
        const fullText = data.captions.map(line => line.text).join(' ');
        
        // If fetch is successful, save to cache
        await setInCache('transcript', videoId, fullText);
        
        return { success: true, transcript: fullText };
    } catch (error) {
        console.error(`[TubeTutor] Transcript fetch failed for ${videoId}:`, error);
        return { success: false, error: "The transcript service is currently unavailable." };
    }
}


// --- 3. NEW AI SUMMARIZER LOGIC ---
// Store the summarizer instance to avoid re-creating it unnecessarily
let summarizer = null;

async function getSummaryNotes(transcript) {
    // Input validation
    if (!transcript || typeof transcript !== 'string' || transcript.length === 0) {
        return { success: false, error: "Transcript is invalid or empty." };
    }
    
    // A. Check if the AI Summarizer is available at all
    const Summarizer = self.Summarizer || window.Summarizer;  // Fallback for context
    if (!Summarizer) {
        return { success: false, error: "AI Summarizer API is not available on this browser." };
    }
    const availability = await Summarizer.availability();
    if (availability !== 'available') {
        return { success: false, error: `AI model is not ready. Status: ${availability}` };
    }

    // B. Check user activation (required for create())
    if (navigator.userActivation && !navigator.userActivation.isActive) {
        console.warn('[TubeTutor] No user gesture—prompting activation.');
        // In extensions, you might dispatch a synthetic click or instruct user
        return { success: false, error: "User interaction required (e.g., click to activate AI)." };
    }

    // C. Create the summarizer instance if it doesn't exist
    if (!summarizer) {
        console.log('[TubeTutor] Creating new Summarizer instance.');
        const options = {
            type: 'key-points',
            format: 'plain-text',
            length: 'long',
            monitor: (m) => {
                m.addEventListener('downloadprogress', (e) => {
                    console.log(`[TubeTutor] Model progress: ${Math.round(e.loaded * 100)}%`);
                });
            }
        };
        summarizer = await Summarizer.create(options);
        console.log('[TubeTutor] Summarizer instance created successfully.');
    }
    
    // D. Generate the summary
    try {
        console.log('[TubeTutor] Generating summary...');
        const summary = await summarizer.summarize(transcript, {
            context: 'Extract key points from this video transcript as concise notes.'  // Optional guide
        });
        console.log(`[TubeTutor] Summary length: ${summary.length} chars`);
        console.log('[TubeTutor] Summary preview:', summary.slice(0, 200) + '...');
        console.log('[TubeTutor] Summary generated successfully.');
        return { success: true, notes: summary };
    } catch (error) {
        console.error('[TubeTutor] Summarizer API failed:', error.name, error.message);
        // Optional: Destroy on fatal error (but not needed per docs)
        if (summarizer) {
            summarizer = null;  // Reset for retry
        }
        return { success: false, error: `Failed to generate AI notes: ${error.message}` };
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.group(`[TubeTutor] Message received: ${message.type}`);
  console.log('Payload:', message.payload);

  // --- HANDLER 1: FOR ENROLLING A NEW COURSE ---
  if (message.type === 'ENROLL_COURSE') {
    const newCourse = message.payload;
    
    chrome.storage.local.get({ courses: [] }, (result) => {
      const existingCourses = result.courses;
      const isAlreadyEnrolled = existingCourses.some(
        (course) => course.playlistId === newCourse.playlistId
      );

      if (!isAlreadyEnrolled) {
        const updatedCourses = [...existingCourses, newCourse];
        chrome.storage.local.set({ courses: updatedCourses }, () => {
          console.log('SUCCESS! Course saved:', newCourse.title);
          console.groupEnd();
        });
      } else {
        console.log('Course is already enrolled.');
        console.groupEnd();
      }
    });
    // This handler is asynchronous due to storage.get/set
    return true; 
  }

  // --- HANDLER 2: FOR CHECKING ENROLLMENT STATUS (NEW!) ---
  else if (message.type === 'CHECK_ENROLLMENT_STATUS') {
    const { playlistId } = message.payload;

    chrome.storage.local.get({ courses: [] }, (result) => {
      const isEnrolled = result.courses.some(
        (course) => course.playlistId === playlistId
      );
      console.log(`Checking status for ${playlistId}. Is enrolled?`, isEnrolled);
      // Send the answer back to the content script
      sendResponse({ isEnrolled: isEnrolled });
    });

    // We MUST return true here to indicate we will send a response asynchronously.
    console.groupEnd();
    return true; 
  }

  // --- HANDLER 3: FOR MARKING VIDEOS OF PLAYLIST ---
  else if (message.type === 'CHECK_VIDEO_STATUS') {
    const { playlistId, videoId } = message.payload;

    chrome.storage.local.get({ courses: [] }, (result) => {
      let isEnrolled = false;
      // Find the course that matches the playlistId
      const course = result.courses.find(c => c.playlistId === playlistId);
      if (course && course.videos) {
        // If the course exists, check if our videoId is in its video list
        isEnrolled = course.videos.some(v => v.videoId === videoId);
      }
      
      console.log(`Checking video ${videoId} in playlist ${playlistId}. Is enrolled?`, isEnrolled);
      sendResponse({ isEnrolled: isEnrolled });
    });
    
    console.groupEnd();
    return true; // Asynchronous response
  }

  // --- REFACTORED 'GET_TRANSCRIPT' HANDLER ---
  // This handler now just acts as a wrapper around our reusable function.
  else if (message.type === 'GET_TRANSCRIPT') {
      const { videoId } = message.payload;
      getTranscript(videoId).then(sendResponse);
      return true;
  }
  else if (message.type === 'GET_NOTES') {
        const { videoId } = message.payload;

        (async () => {
            // First, check if we have cached notes
            const cachedNotes = await getFromCache('notes', videoId);
            if (cachedNotes) {
                console.log(`[TubeTutor] Notes for ${videoId} found in cache.`);
                sendResponse({ success: true, notes: cachedNotes });
                return;
            }

            // If no cached notes, get the transcript (from cache or fetch)
            const transcriptResult = await getTranscript(videoId);
            if (!transcriptResult.success) {
                sendResponse(transcriptResult); // Pass the error along
                return;
            }

            // Now, generate the summary from the transcript
            const notesResult = await getSummaryNotes(transcriptResult.transcript);
            if (notesResult.success) {
                // If successful, cache the new notes
                await setInCache('notes', videoId, notesResult.notes);
            }
            
            sendResponse(notesResult);
        })();

        return true; // Indicate we will respond asynchronously
    }
  console.groupEnd();
});