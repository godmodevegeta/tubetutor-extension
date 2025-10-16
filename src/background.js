import { YoutubeTranscript } from 'youtube-transcript';

console.log('TubeTutor Background Script Loaded!');

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
  
  // This is the final, hardened version with the User-Agent fix.
else if (message.type === 'GET_TRANSCRIPT') {
    const { videoId } = message.payload;
    
    const smartFetchTranscript = async () => {
        // --- ATTEMPT 1: USE THE LIBRARY (Handles XML transcripts) ---
        try {
            console.log(`[TubeTutor] Attempt 1: Using 'youtube-transcript' library for ${videoId}`);
            const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
            if (transcript && transcript.length > 0) {
                console.log("[TubeTutor] Success with library (XML transcript).");
                return { success: true, transcript: transcript.map(t => t.text).join(' ') };
            }
        } catch (error) {
            console.warn(`[TubeTutor] Library failed, which is expected for some videos. Reason: ${error.message}`);
        }

        // --- ATTEMPT 2: CUSTOM FETCHER (Handles JSON ASR transcripts) ---
        try {
            console.log(`[TubeTutor] Attempt 2: Using custom fetcher for JSON transcript.`);

            // --- THE CRITICAL FIX IS HERE ---
            // We define a standard set of headers to disguise our request.
            const headers = new Headers({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
            });

            // Pass the same headers to BOTH fetch calls to be consistent.
            const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers });
            const videoPageHtml = await videoPageResponse.text();

            const captionsJsonRegex = /"captionTracks":(\[.*?\])/;
            const match = videoPageHtml.match(captionsJsonRegex);

            if (!match || !match[1]) {
                throw new Error("Could not find caption track JSON in the page HTML.");
            }

            const captionTracks = JSON.parse(match[1]);
            const asrTrack = captionTracks.find(track => track.languageCode === 'en' && track.kind === 'asr');
            
            if (!asrTrack || !asrTrack.baseUrl) {
                throw new Error("Could not find a valid English ASR transcript URL.");
            }

            const transcriptResponse = await fetch(asrTrack.baseUrl, { headers });
            
            const transcriptText = await transcriptResponse.text();
            if (!transcriptText) {
                throw new Error("Custom fetcher received an empty transcript response.");
            }
            
            const transcriptJson = JSON.parse(transcriptText);

            const fullText = transcriptJson.events
                .filter(event => event.segs)
                .map(event => event.segs.map(seg => seg.utf8).join(''))
                .join(' ')
                .replace(/\n/g, ' ');

            if (fullText.length > 0) {
                 console.log("[TubeTutor] Success with custom fetcher (JSON transcript).");
                 return { success: true, transcript: fullText };
            } else {
                 throw new Error("Custom fetcher found a transcript but it was empty after parsing.");
            }

        } catch (error) {
            console.error(`[TubeTutor] All attempts to fetch transcript failed. Final error:`, error);
            return { success: false, error: "No transcripts available for this video. (2)" };
        }
    };

    // The message listener boilerplate
    console.group(`[TubeTutor] Message received: ${message.type}`);
    smartFetchTranscript().then(response => {
        sendResponse(response);
        console.groupEnd();
    });
    
    return true;
}
  console.groupEnd();
});