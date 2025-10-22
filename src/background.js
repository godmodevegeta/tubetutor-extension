console.log('TubeTutor Background Script Loaded!');

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = {
  CACHE_EXPIRY_DAYS: 7,
  CACHE_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
  TACTIQ_API_URL: 'https://tactiq-apps-prod.tactiq.io/transcript',
  DEFAULT_QUESTION_COUNT: 10,
  LOG_PREFIX: '[TubeTutor]'
};

const CACHE_KEYS = {
  TRANSCRIPT: 'transcript',
  NOTES: 'notes',
  QUIZ: 'quiz'
};

const MESSAGE_TYPES = {
  ENROLL_COURSE: 'ENROLL_COURSE',
  CHECK_ENROLLMENT_STATUS: 'CHECK_ENROLLMENT_STATUS',
  CHECK_VIDEO_STATUS: 'CHECK_VIDEO_STATUS',
  GET_TRANSCRIPT: 'GET_TRANSCRIPT',
  GET_NOTES: 'GET_NOTES',
  GET_QUIZ: 'GET_QUIZ',
  CHAT_PROMPT: 'CHAT_PROMPT',
  CLEAR_CHAT: 'CLEAR_CHAT',
  CHAT_CHUNK: 'CHAT_CHUNK',
  CHAT_COMPLETE: 'CHAT_COMPLETE',
  CHAT_ERROR: 'CHAT_ERROR',
  GET_ALL_COURSES: 'GET_ALL_COURSES',
  UNENROLL_COURSE: 'UNENROLL_COURSE',
  MARK_COURSE_COMPLETED: 'MARK_COURSE_COMPLETED',

};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logs a message with the TubeTutor prefix
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 */
function log(message, ...args) {
  console.log(`${CONFIG.LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the TubeTutor prefix
 * @param {string} message - The error message
 * @param {...any} args - Additional arguments to log
 */
function logError(message, ...args) {
  console.error(`${CONFIG.LOG_PREFIX} ${message}`, ...args);
}

/**
 * Creates a standardized error response
 * @param {string} errorMessage - The error message
 * @returns {{success: false, error: string}}
 */
function createErrorResponse(errorMessage) {
  return { success: false, error: errorMessage };
}

/**
 * Creates a standardized success response
 * @param {Object} data - The response data
 * @returns {{success: true, ...data}}
 */
function createSuccessResponse(data) {
  return { success: true, ...data };
}

// ============================================================================
// CACHE MANAGER
// ============================================================================

class CacheManager {
  /**
   * Generates a cache key for storage
   * @param {string} type - The cache type (transcript, notes, quiz)
   * @returns {string} The cache key
   */
  static getCacheKey(type) {
    return `${type}_cache`;
  }

  /**
   * Retrieves cached data for a video
   * @param {string} type - The cache type
   * @param {string} videoId - The video ID
   * @returns {Promise<any|null>} The cached data or null if expired/not found
   */
  static async get(type, videoId) {
    const cacheKey = this.getCacheKey(type);
    const result = await chrome.storage.local.get(cacheKey);
    const cache = result[cacheKey] || {};
    const entry = cache[videoId];

    if (entry && Date.now() < entry.expiry) {
      log(`${type} for ${videoId} found in cache.`);
      return entry.data;
    }
    
    return null;
  }

  /**
   * Stores data in cache for a video
   * @param {string} type - The cache type
   * @param {string} videoId - The video ID
   * @param {any} data - The data to cache
   * @returns {Promise<void>}
   */
  static async set(type, videoId, data) {
    const cacheKey = this.getCacheKey(type);
    const result = await chrome.storage.local.get(cacheKey);
    const cache = result[cacheKey] || {};
    const expiry = Date.now() + CONFIG.CACHE_EXPIRY_MS;

    cache[videoId] = { data, expiry };
    await chrome.storage.local.set({ [cacheKey]: cache });
    log(`${type} for ${videoId} cached successfully.`);
  }

  /**
   * Clears all caches or a specific cache type
   * @param {string} [type] - Optional cache type to clear
   * @returns {Promise<void>}
   */
  static async clear(type = null) {
    if (type) {
      const cacheKey = this.getCacheKey(type);
      await chrome.storage.local.remove(cacheKey);
      log(`${type} cache cleared.`);
    } else {
      const keys = Object.values(CACHE_KEYS).map(k => this.getCacheKey(k));
      await chrome.storage.local.remove(keys);
      log('All caches cleared.');
    }
  }
}

// ============================================================================
// TRANSCRIPT SERVICE
// ============================================================================

class TranscriptService {
  /**
   * Fetches transcript from the Tactiq API
   * @param {string} videoId - The YouTube video ID
   * @returns {Promise<{success: boolean, transcript?: string, error?: string}>}
   */
  static async fetch(videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      log(`Fetching transcript for ${videoId} from API.`);
      
      const response = await fetch(CONFIG.TACTIQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, langCode: 'en' })
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.captions || data.captions.length === 0) {
        throw new Error('API returned no captions.');
      }

      const fullText = data.captions.map(line => line.text).join(' ');
      return createSuccessResponse({ transcript: fullText });

    } catch (error) {
      logError(`Transcript fetch failed for ${videoId}:`, error);
      return createErrorResponse('The transcript service is currently unavailable.');
    }
  }

  /**
   * Gets transcript from cache or fetches if not cached
   * @param {string} videoId - The YouTube video ID
   * @returns {Promise<{success: boolean, transcript?: string, error?: string}>}
   */
  static async get(videoId) {
    const cached = await CacheManager.get(CACHE_KEYS.TRANSCRIPT, videoId);
    
    if (cached) {
      return createSuccessResponse({ transcript: cached });
    }

    const result = await this.fetch(videoId);
    
    if (result.success) {
      await CacheManager.set(CACHE_KEYS.TRANSCRIPT, videoId, result.transcript);
    }

    return result;
  }
}

// ============================================================================
// AI SUMMARIZER SERVICE
// ============================================================================

class SummarizerService {
  static instance = null;

  /**
   * Checks if the Summarizer API is available
   * @returns {Promise<{available: boolean, error?: string}>}
   */
  static async checkAvailability() {
    const Summarizer = self.Summarizer || window.Summarizer;
    
    if (!Summarizer) {
      return { 
        available: false, 
        error: 'AI Summarizer API is not available on this browser.' 
      };
    }

    const availability = await Summarizer.availability();
    
    if (availability !== 'available') {
      return { 
        available: false, 
        error: `AI model is not ready. Status: ${availability}` 
      };
    }

    return { available: true };
  }

  /**
   * Checks for user activation (required for API)
   * @returns {boolean}
   */
  static hasUserActivation() {
    if (navigator.userActivation && !navigator.userActivation.isActive) {
      console.warn(`${CONFIG.LOG_PREFIX} No user gesture—activation required.`);
      return false;
    }
    return true;
  }

  /**
   * Creates or retrieves the summarizer instance
   * @returns {Promise<Object>}
   */
  static async getInstance() {
    if (!this.instance) {
      log('Creating new Summarizer instance.');
      
      const Summarizer = self.Summarizer || window.Summarizer;
      const options = {
        type: 'key-points',
        format: 'plain-text',
        length: 'long',
        monitor: (m) => {
          m.addEventListener('downloadprogress', (e) => {
            log(`Model progress: ${Math.round(e.loaded * 100)}%`);
          });
        }
      };

      this.instance = await Summarizer.create(options);
      log('Summarizer instance created successfully.');
    }

    return this.instance;
  }

  /**
   * Generates summary notes from a transcript
   * @param {string} transcript - The video transcript
   * @returns {Promise<{success: boolean, notes?: string, error?: string}>}
   */
  static async generateNotes(transcript) {
    // Validation
    if (!transcript || typeof transcript !== 'string' || transcript.length === 0) {
      return createErrorResponse('Transcript is invalid or empty.');
    }

    // Check availability
    const availabilityCheck = await this.checkAvailability();
    if (!availabilityCheck.available) {
      return createErrorResponse(availabilityCheck.error);
    }

    // Check user activation
    if (!this.hasUserActivation()) {
      return createErrorResponse('User interaction required (e.g., click to activate AI).');
    }

    try {
      const summarizer = await this.getInstance();
      
      log('Generating summary...');
      const summary = await summarizer.summarize(transcript, {
        context: 'Extract key points from this video transcript as concise notes.'
      });

      log(`Summary generated successfully (${summary.length} chars).`);
      return createSuccessResponse({ notes: summary });

    } catch (error) {
      logError('Summarizer API failed:', error.name, error.message);
      this.instance = null; // Reset for retry
      return createErrorResponse(`Failed to generate AI notes: ${error.message}`);
    }
  }
}

// ============================================================================
// QUIZ GENERATOR SERVICE
// ============================================================================

class QuizGeneratorService {
  static session = null;

  static QUIZ_SCHEMA = {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { 
              type: 'array', 
              items: { type: 'string' }, 
              minItems: 4, 
              maxItems: 4 
            },
            correctAnswerIndex: { type: 'number', minimum: 0, maximum: 3 }
          },
          required: ['question', 'options', 'correctAnswerIndex']
        }
      }
    },
    required: ['questions']
  };

  /**
   * Checks if the Language Model API is available
   * @returns {Promise<{available: boolean, error?: string}>}
   */
  static async checkAvailability() {
    if (!self.LanguageModel) {
      return { 
        available: false, 
        error: 'AI Prompt API is not available.' 
      };
    }

    const availability = await self.LanguageModel.availability();
    
    if (availability !== 'available') {
      return { 
        available: false, 
        error: `AI model is not ready: ${availability}` 
      };
    }

    return { available: true };
  }

  /**
   * Gets or creates the quiz session
   * @returns {Promise<Object>}
   */
  static async getSession() {
    if (!this.session) {
      log('Creating new LanguageModel session for quizzes.');
      this.session = await self.LanguageModel.create();
    }
    return this.session;
  }

  /**
   * Builds the quiz generation prompt
   * @param {string} transcript - The video transcript
   * @param {number} questionCount - Number of questions to generate
   * @returns {string}
   */
  static buildPrompt(transcript, questionCount) {
    return `Based on the following transcript, generate a challenging, high-quality multiple-choice quiz with exactly ${questionCount} questions to test a viewer's understanding. Each question must have exactly 4 options.
Important: In the questions and options, never mention or reference the "transcript"—always refer to "the video" instead (e.g., instead of "as described in the transcript," say "as shown in the video").
Transcript:
"""
${transcript}
"""`;
  }

  /**
   * Generates a quiz from a transcript
   * @param {string} transcript - The video transcript
   * @param {number} questionCount - Number of questions to generate
   * @returns {Promise<{success: boolean, quiz?: Object, error?: string}>}
   */
  static async generate(transcript, questionCount = CONFIG.DEFAULT_QUESTION_COUNT) {
    // Check availability
    const availabilityCheck = await this.checkAvailability();
    if (!availabilityCheck.available) {
      return createErrorResponse(availabilityCheck.error);
    }

    try {
      const session = await this.getSession();
      const prompt = this.buildPrompt(transcript, questionCount);

      log('Prompting AI to generate quiz...');
      
      const result = await session.prompt(prompt, {
        responseConstraint: { schema: this.QUIZ_SCHEMA }
      });

      const parsedResult = JSON.parse(result);
      log('AI Quiz generated and parsed successfully.');
      
      return createSuccessResponse({ quiz: parsedResult });

    } catch (error) {
      logError('Prompt API failed for quiz generation:', error);
      return createErrorResponse('Failed to generate AI quiz.');
    }
  }
}

// ============================================================================
// CHAT SERVICE
// ============================================================================

class ChatService {
  static sessions = {};

  /**
   * Builds the system prompt for the chat
   * @param {string} transcript - The video transcript
   * @returns {string}
   */
  static buildSystemPrompt(transcript) {
    return `You are TubeTutor, a warm, enthusiastic AI buddy who's obsessed with making video learning fun and insightful. You draw your knowledge directly from watching this video closely—stick to its key ideas, examples, and themes to keep things spot-on and relevant. Be concise, positive, and super engaging, like chatting with a friend over coffee.

Your vibe: Friendly and full of contagious curiosity! Spark wonder in every reply—end with an open-ended question or hook that invites the user to dive deeper, share their take, or connect it to their life. This keeps the convo flowing naturally.

How to respond:
- If they kick off casually (like "Hi", "Yo", or "What's up?"), mirror their chill energy with a quick, fun echo (e.g., "Hey! Loving this video?") and gently nudge toward a video topic without pushing.
- Otherwise, steer toward healthy, thoughtful discussions on the video's concepts—unpack ideas step-by-step, highlight cool connections, and encourage reflection. Make it feel like an adventure in understanding.
- If they ask where your info comes from, just say: "I got it from watching the video super closely—it's packed with gems!"
- Guardrails: Stay laser-focused on the video's content. Only dip into a quick external example (like a real-world analogy) if it lights up a concept from the video—keep it brief and tie it right back. No tangents, no negativity, no outside facts that stray from the video.

The video's core content to build from:
"""
${transcript}
"""

Let's make this video unforgettable—what's one thing from it that's got you thinking already?`;
  }

  /**
   * Creates a new chat session for a video
   * @param {string} videoId - The video ID
   * @param {string} transcript - The video transcript
   * @param {Array} history - The chat history
   * @returns {Promise<Object>}
   */
  static async createSession(videoId, transcript, history) {
    if (!self.LanguageModel) {
      throw new Error('AI not available.');
    }

    const availability = await self.LanguageModel.availability();
    if (availability !== 'available') {
      throw new Error(`AI model not ready: ${availability}`);
    }

    log(`Creating new chat session for ${videoId}`);

    const initialPrompts = [
      {
        role: 'system',
        content: this.buildSystemPrompt(transcript)
      },
      ...history
    ];

    this.sessions[videoId] = await self.LanguageModel.create({ initialPrompts });
    return this.sessions[videoId];
  }

  /**
   * Gets or creates a chat session
   * @param {string} videoId - The video ID
   * @param {string} transcript - The video transcript
   * @param {Array} history - The chat history
   * @returns {Promise<Object>}
   */
  static async getSession(videoId, transcript, history) {
    if (!this.sessions[videoId]) {
      return await this.createSession(videoId, transcript, history);
    }
    return this.sessions[videoId];
  }

  /**
   * Sends a message and streams the response
   * @param {string} videoId - The video ID
   * @param {string} transcript - The video transcript
   * @param {Array} history - The chat history
   * @returns {Promise<void>}
   */
  static async sendMessage(videoId, transcript, history) {
    try {
      const session = await this.getSession(videoId, transcript, history);
      const userPrompt = history[history.length - 1].content;

      const stream = session.promptStreaming(userPrompt);

      for await (const chunk of stream) {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.CHAT_CHUNK,
          payload: { videoId, chunk }
        });
      }

      chrome.runtime.sendMessage({ 
        type: MESSAGE_TYPES.CHAT_COMPLETE, 
        payload: { videoId } 
      });

    } catch (error) {
      logError('Chat prompt failed:', error);
      chrome.runtime.sendMessage({ 
        type: MESSAGE_TYPES.CHAT_ERROR, 
        payload: { videoId, error: error.message } 
      });
    }
  }

  /**
   * Clears a chat session
   * @param {string} videoId - The video ID
   */
  static clearSession(videoId) {
    if (this.sessions[videoId]) {
      this.sessions[videoId].destroy();
      delete this.sessions[videoId];
      log(`Chat session for ${videoId} destroyed.`);
    }
  }
}

// ============================================================================
// COURSE MANAGER
// ============================================================================

class CourseManager {
  /**
   * Gets all courses from storage
   * @returns {Promise<Array>}
   */
  static async getCourses() {
    const result = await chrome.storage.local.get({ courses: [] });
    return result.courses;
  }

  /**
   * Checks if a course is enrolled
   * @param {string} playlistId - The playlist ID
   * @returns {Promise<boolean>}
   */
  static async isEnrolled(playlistId) {
    const courses = await this.getCourses();
    return courses.some(course => course.playlistId === playlistId);
  }

  /**
   * Enrolls in a new course
   * @param {Object} courseData - The course data
   * @returns {Promise<boolean>} True if enrolled, false if already enrolled
   */
  static async enroll(courseData) {
    const courses = await this.getCourses();
    const alreadyEnrolled = await this.isEnrolled(courseData.playlistId);

    if (alreadyEnrolled) {
      log('Course is already enrolled.');
      return false;
    }

    const updatedCourses = [...courses, courseData];
    await chrome.storage.local.set({ courses: updatedCourses });
    log('SUCCESS! Course saved:', courseData.title);
    return true;
  }

  /**
   * Checks if a video is in a playlist's course
   * @param {string} playlistId - The playlist ID
   * @param {string} videoId - The video ID
   * @returns {Promise<boolean>}
   */
  static async isVideoInPlaylist(playlistId, videoId) {
    const courses = await this.getCourses();
    const course = courses.find(c => c.playlistId === playlistId);
    
    if (course && course.videos) {
      return course.videos.some(v => v.videoId === videoId);
    }
    
    return false;
  }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

const MessageHandlers = {
  /**
   * Handles course enrollment
   */
  [MESSAGE_TYPES.ENROLL_COURSE]: async (payload, sendResponse) => {
    await CourseManager.enroll(payload);
    return true;
  },

  /**
   * Checks enrollment status for a playlist
   */
  [MESSAGE_TYPES.CHECK_ENROLLMENT_STATUS]: async (payload, sendResponse) => {
    const isEnrolled = await CourseManager.isEnrolled(payload.playlistId);
    sendResponse({ isEnrolled });
    return true;
  },

  /**
   * Checks if a video is in a playlist
   */
  [MESSAGE_TYPES.CHECK_VIDEO_STATUS]: async (payload, sendResponse) => {
    const isEnrolled = await CourseManager.isVideoInPlaylist(
      payload.playlistId, 
      payload.videoId
    );
    sendResponse({ isEnrolled });
    return true;
  },

  /**
   * Gets transcript for a video
   */
  [MESSAGE_TYPES.GET_TRANSCRIPT]: async (payload, sendResponse) => {
    const result = await TranscriptService.get(payload.videoId);
    sendResponse(result);
    return true;
  },

  /**
   * Gets notes for a video
   */
  [MESSAGE_TYPES.GET_NOTES]: async (payload, sendResponse) => {
    const { videoId } = payload;

    // Check cache first
    const cachedNotes = await CacheManager.get(CACHE_KEYS.NOTES, videoId);
    if (cachedNotes) {
      sendResponse(createSuccessResponse({ notes: cachedNotes }));
      return true;
    }

    // Get transcript
    const transcriptResult = await TranscriptService.get(videoId);
    if (!transcriptResult.success) {
      sendResponse(transcriptResult);
      return true;
    }

    // Generate notes
    const notesResult = await SummarizerService.generateNotes(
      transcriptResult.transcript
    );

    if (notesResult.success) {
      await CacheManager.set(CACHE_KEYS.NOTES, videoId, notesResult.notes);
    }

    sendResponse(notesResult);
    return true;
  },

  /**
   * Gets quiz for a video
   */
  [MESSAGE_TYPES.GET_QUIZ]: async (payload, sendResponse) => {
    const { videoId, forceNew = false } = payload;

    // Check cache unless forcing new generation
    if (!forceNew) {
      const cachedQuiz = await CacheManager.get(CACHE_KEYS.QUIZ, videoId);
      if (cachedQuiz) {
        sendResponse(createSuccessResponse({ quiz: cachedQuiz }));
        return true;
      }
    }

    // Get transcript
    const transcriptResult = await TranscriptService.get(videoId);
    if (!transcriptResult.success) {
      sendResponse(transcriptResult);
      return true;
    }

    // Generate quiz
    const quizResult = await QuizGeneratorService.generate(
      transcriptResult.transcript
    );

    if (quizResult.success) {
      await CacheManager.set(CACHE_KEYS.QUIZ, videoId, quizResult.quiz);
    }

    sendResponse(quizResult);
    return true;
  },

  /**
   * Handles chat prompts
   */
  [MESSAGE_TYPES.CHAT_PROMPT]: async (payload, sendResponse) => {
    const { videoId, transcript, history } = payload;
    await ChatService.sendMessage(videoId, transcript, history);
    return true;
  },

  /**
   * Clears a chat session
   */
  [MESSAGE_TYPES.CLEAR_CHAT]: async (payload, sendResponse) => {
    ChatService.clearSession(payload.videoId);
    // No response needed
  },

  [MESSAGE_TYPES.GET_ALL_COURSES]: async (payload, sendResponse) => {
    const courses = await CourseManager.getCourses();
    log(`Retrieved ${courses.length} courses from storage.`);
    sendResponse(createSuccessResponse({ courses }));
    return true;
  },

  [MESSAGE_TYPES.UNENROLL_COURSE]: async (payload, sendResponse) => {
    const { playlistId } = payload;
    let courses = await CourseManager.getCourses();
    
    // Filter out the course to be removed
    const updatedCourses = courses.filter(course => course.playlistId !== playlistId);

    // Persist the new, smaller list
    await chrome.storage.local.set({ courses: updatedCourses });
    
    log(`Un-enrolled from course ${playlistId}. ${updatedCourses.length} courses remaining.`);
    sendResponse(createSuccessResponse({ courses: updatedCourses })); // Send back the new list
    return true;
  },

  [MESSAGE_TYPES.MARK_COURSE_COMPLETED]: async (payload, sendResponse) => {
    const { playlistId, isCompleted } = payload;
    let courses = await CourseManager.getCourses();

    const courseIndex = courses.findIndex(course => course.playlistId === playlistId);

    if (courseIndex > -1) {
      courses[courseIndex].isCompleted = isCompleted;
      await chrome.storage.local.set({ courses: courses });
      log(`Course ${playlistId} marked as ${isCompleted ? 'completed' : 'in-progress'}.`);
      sendResponse(createSuccessResponse({ courses })); // Send back the updated list
    } else {
      logError(`Could not find course ${playlistId} to mark complete.`);
      sendResponse(createErrorResponse('Course not found.'));
    }
    return true;
  },

};

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.group(`${CONFIG.LOG_PREFIX} Message received: ${message.type}`);
  console.log('Payload:', message.payload);

  const handler = MessageHandlers[message.type];

  if (handler) {
    handler(message.payload, sendResponse)
      .then(() => console.groupEnd())
      .catch(error => {
        logError('Handler error:', error);
        console.groupEnd();
      });
    return true; // Keep channel open for async response
  }

  console.warn('Unknown message type:', message.type);
  console.groupEnd();
  return false;
});