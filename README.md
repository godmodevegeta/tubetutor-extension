# TubeTutor

## The Problem

We've all been there. You find a fantastic 20-part Python tutorial or a deep-dive history course on YouTube, ready to learn. A week later, you come back to a sea of red progress bars. Which video were you on? How much time is left? You're passively watching, not actively learning, and the valuable knowledge gets lost as soon as you close the tab. YouTube is the world's biggest classroom, but it lacks the tools of a real classroom.

## The Solution: TubeTutor

TubeTutor is a Chrome extension that transforms YouTube playlists into interactive, trackable courses. It acts as a smart layer on top of YouTube, managing your progress and turning passive viewing into active learning with a powerful, on-device AI toolkit. With TubeTutor, you can enroll in any playlist, track your progress automatically, and instantly generate notes, flashcards, and quizzes for any video—all privately and offline.

## The "Magic" - Why Built-in AI is a Game Changer

- **Instantaneous**: When you click "Generate Notes," they appear in a blink. There's no lag, no loading spinner, no waiting for a server. This is the power of the on-device Summarizer API.

- **Completely Private**: Your learning journey—the courses you take, the notes you generate, your quiz scores—is your business. Because all AI processing happens on your device, your data never leaves your computer.

- **Always Available**: On a plane with no Wi-Fi? You can still review all your notes and practice with your generated flashcards and quizzes. Your classroom is now fully offline.

- **Unlimited & Free**: No API keys, no usage limits, no subscriptions. TubeTutor can help you learn as much as you want, without ever hitting a paywall, because the AI is built right into Chrome.

## Refined Demo Flow & User Experience

This flow is designed to be seamless and "just work" with intuitive design.

### Discovery & Enrollment

A user navigates to a YouTube playlist. The TubeTutor icon in their browser bar lights up, and a clean, non-intrusive button appears on the page: **"Enroll in this Course."**

Clicking it adds the playlist to the TubeTutor Dashboard. An elegant overlay appears briefly, confirming enrollment and showing progress: *"Course Added! 0/20 videos complete. Approx. 4 hours remaining."*

### The Learning Interface

As the user watches a video, TubeTutor provides a small, collapsible sidebar. This is the **"AI Learning Toolkit."**

- **Generate Notes**: A single click on this button uses the video's transcript and the Summarizer API to instantly produce clean, concise, timestamped bullet points.
  - *Example: "04:15 - Introduction to variables and data types."*

- **Generate Flashcards**: Clicking this uses the Prompt API to create a set of Q&A-style flashcards based on the video's key concepts, which the user can flip through to test their knowledge.

- **Take a Quiz**: This uses the Prompt API with a more structured request to generate 3-5 multiple-choice questions about the video's content, providing instant feedback.

### The Course Dashboard

This is the central hub, accessible from the extension's icon. It lists all "enrolled" courses.

- Each course has a clear progress bar, ETA, and a link back to the playlist.
- Users can expand a course to view all their generated notes, flashcards, and quiz results in one place, creating a comprehensive study guide.

### The "Wow" Feature - The Knowledge Search

The dashboard has a search bar. The user can type a question like, *"What did I learn about 'for loops' in Python?"*

Using the Prompt API, TubeTutor searches across the notes and transcripts of all enrolled courses, providing a consolidated answer with links to the exact moments in the videos where the topic was discussed. This transforms the extension from a simple tracker into a personal, searchable learning database.