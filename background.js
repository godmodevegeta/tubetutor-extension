console.log('TubeTutor Background Script Loaded!');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background script:', message);

  // Check the type of message
  if (message.type === 'ENROLL_COURSE') {
    console.log('Enrolling in course with ID:', message.payload.playlistId);
    // In the future, we will save this data to chrome.storage
    // For now, we just log it to confirm it worked.
  }
  
  // It's good practice to return true for asynchronous responses,
  // though we are not sending a response back in this case.
  return true;
});