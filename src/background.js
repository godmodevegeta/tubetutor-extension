import { getSubtitles } from 'youtube-caption-extractor';

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


// This is the new, refactored handler that calls the Tactiq API.
else if (message.type === 'GET_TRANSCRIPT') {
    const { videoId } = message.payload;

    const callTactiqApi = async () => {
        const TACTIQ_API_URL = 'https://tactiq-apps-prod.tactiq.io/transcript';
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        try {
            console.log(`[TubeTutor] Calling Tactiq API for video: ${videoUrl}`);

            // Make a POST request to the API
            const response = await fetch(TACTIQ_API_URL, {
                method: 'POST',
                headers: {
                    // It's crucial to tell the server we're sending JSON data
                    'Content-Type': 'application/json'
                },
                // The body must be a JSON string
                body: JSON.stringify({
                    videoUrl: videoUrl,
                    langCode: 'en'
                })
            });

            // Check if the network request itself was successful
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json();

            // Check if the response contains the 'captions' array we expect
            if (data.captions && data.captions.length > 0) {
                // If it does, map over the array to get the 'text' from each line
                // and join them all into a single string.
                const fullText = data.captions.map(line => line.text).join(' ');
                
                console.log("[TubeTutor] Successfully fetched and processed transcript from Tactiq API.");
                return { success: true, transcript: fullText };
            } else {
                // This handles cases where the API works but returns no captions
                throw new Error("API returned a successful response but with no captions.");
            }

        } catch (error) {
            console.error(`[TubeTutor] Tactiq API call failed:`, error);
            // Return a generic error to the user
            return { success: false, error: "The transcript service is currently unavailable." };
        }
    };

    // The standard boilerplate to run our async function and send the response
    console.group(`[TubeTutor] Message received: ${message.type}`);
    callTactiqApi().then(response => {
        sendResponse(response);
        console.groupEnd();
    });
    
    return true;
}
  console.groupEnd();
});