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

  console.groupEnd();
});