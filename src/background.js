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

// --- 4. AI PROMPT ENGINEERING FOR QUIZ---

// Store the AI session to avoid re-creating it on every call.
let quizSession = null;

// Define the precise JSON schema we want the AI to return.
const quizSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
          correctAnswerIndex: { type: 'number', minimum: 0, maximum: 3 }
        },
        required: ['question', 'options', 'correctAnswerIndex']
      }
    }
  },
  required: ['questions']
};

// This is the core function for generating the quiz.
async function generateQuizFromTranscript(transcript, questionCount = 10) {
    if (!self.LanguageModel) {
        return { success: false, error: "AI Prompt API is not available." };
    }
    const availability = await self.LanguageModel.availability();
    if (availability !== 'available') {
        return { success: false, error: `AI model is not ready: ${availability}` };
    }
    if (!quizSession) {
        console.log('[TubeTutor] Creating new LanguageModel session for quizzes.');
        quizSession = await self.LanguageModel.create();
    }
    
    // The carefully engineered prompt.
    const prompt = `Based on the following transcript, generate a challenging, high-quality multiple-choice quiz with exactly ${questionCount} questions to test a viewer's understanding. Each question must have exactly 4 options.

    Transcript:
    """
    ${transcript}
    """`;

    try {
        console.log('[TubeTutor] Prompting AI to generate quiz...');
        const result = await quizSession.prompt(prompt, {
            responseConstraint: { schema: quizSchema }
        });
        const parsedResult = JSON.parse(result);
        console.log('[TubeTutor] AI Quiz generated and parsed successfully.');
        return { success: true, quiz: parsedResult };
    } catch (error) {
        console.error('[TubeTutor] Prompt API failed for quiz generation:', error);
        return { success: false, error: 'Failed to generate AI quiz.' };
    }
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.group(`[TubeTutor] Message received: ${message.type}`);
  console.log('Payload:', message.payload);
  // Store active chat sessions, keyed by videoId
    const chatSessions = {};

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
    else if (message.type === 'GET_QUIZ') {
    const { videoId, forceNew = false } = message.payload;

    (async () => {
        // Handle "Retry" logic: if forceNew is true, skip the cache check.
        if (!forceNew) {
            const cachedQuiz = await getFromCache('quiz', videoId);
            if (cachedQuiz) {
                console.log(`[TubeTutor] Quiz for ${videoId} found in cache.`);
                sendResponse({ success: true, quiz: cachedQuiz });
                return;
            }
        }

        // Get the transcript (from cache or API)
        const transcriptResult = await getTranscript(videoId);
        if (!transcriptResult.success) {
            sendResponse(transcriptResult); // Pass transcript error
            return;
        }

        // Generate the quiz from the transcript
        const quizResult = await generateQuizFromTranscript(transcriptResult.transcript);
        if (quizResult.success) {
            // If successful, cache the newly generated quiz
            await setInCache('quiz', videoId, quizResult.quiz);
        }
        
        sendResponse(quizResult);
    })();

    return true; // Asynchronous response
    }  
    else if (message.type === 'CHAT_PROMPT') {
        const { videoId, transcript, history } = message.payload;

        (async () => {
            try {
                // A. Create a session if it doesn't exist for this video
                if (!chatSessions[videoId]) {
                    if (!self.LanguageModel) throw new Error("AI not available.");
                    const availability = await self.LanguageModel.availability();
                    if (availability !== 'available') throw new Error(`AI model not ready: ${availability}`);

                    console.log(`[TubeTutor] Creating new chat session for ${videoId}`);
                    
                    // Use initialPrompts to set the context and history
                    const initialPrompts = [
                        {
                            role: 'system',
                            content: `You are TubeTutor, a warm, enthusiastic AI buddy who's obsessed with making video learning fun and insightful. You draw your knowledge directly from watching this video closely—stick to its key ideas, examples, and themes to keep things spot-on and relevant. Be concise, positive, and super engaging, like chatting with a friend over coffee.

                    Your vibe: Friendly and full of contagious curiosity! Spark wonder in every reply—end with an open-ended question or hook that invites the user to dive deeper, share their take, or connect it to their life. This keeps the convo flowing naturally.

                    How to respond:
                    - If they kick off casually (like "Hi", "Yo", or "What's up?"), mirror their chill energy with a quick, fun echo (e.g., "Hey! Loving this video?") and gently nudge toward a video topic without pushing.
                    - Otherwise, steer toward healthy, thoughtful discussions on the video's concepts—unpack ideas step-by-step, highlight cool connections, and encourage reflection. Make it feel like an adventure in understanding.
                    - If they ask where your info comes from, just say: "I got it from watching the video super closely—it's packed with gems!"
                    - Guardrails: Stay laser-focused on the video's content. Only dip into a quick external example (like a real-world analogy) if it lights up a concept from the video—keep it brief and tie it right back. No tangents, no negativity, no outside facts that stray from the video.

                    The video's core content to build from:\n"""\n${transcript}\n"""\n\nLet's make this video unforgettable—what's one thing from it that's got you thinking already?`
                        },
                        ...history // Spread the existing chat history
                    ];

                    chatSessions[videoId] = await self.LanguageModel.create({ initialPrompts });
                }

                // B. Get the last user message from the history
                const userPrompt = history[history.length - 1].content;

                // C. Use promptStreaming for a better UX
                const stream = chatSessions[videoId].promptStreaming(userPrompt);

                // D. Stream the response back to the front-end
                for await (const chunk of stream) {
                    chrome.runtime.sendMessage({
                        type: 'CHAT_CHUNK',
                        payload: { videoId, chunk }
                    });
                }
                // Send a final message to indicate the stream is complete
                chrome.runtime.sendMessage({ type: 'CHAT_COMPLETE', payload: { videoId } });

            } catch (error) {
                console.error('[TubeTutor] Chat prompt failed:', error);
                chrome.runtime.sendMessage({ type: 'CHAT_ERROR', payload: { videoId, error: error.message } });
            }
        })();
        // Note: We don't use sendResponse here because we're sending multiple messages back
        return true; 
    }
    else if (message.type === 'CLEAR_CHAT') {
        const { videoId } = message.payload;
        if (chatSessions[videoId]) {
            chatSessions[videoId].destroy();
            delete chatSessions[videoId];
            console.log(`[TubeTutor] Chat session for ${videoId} destroyed.`);
        }
        // No response needed, this is a fire-and-forget action
    }
    
  console.groupEnd();
});