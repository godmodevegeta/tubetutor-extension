# Maddie — Your Personal AI Learning Companion for YouTube  

![alt text](Maddie.png "Hey Maddie!")

## Inspiration  

YouTube is the world’s biggest classroom — but it forgot the students.  

Every day, millions of learners watch educational content on YouTube: coding tutorials, lectures, science explainers, and crash courses. Yet, after a few days, most can’t remember where they left off or what they learned. The learning experience is passive — a red progress bar, no structure, no reinforcement, no reflection.  

I wanted to change that.  

The inspiration for **Maddie** came from two observations:  
1. **YouTube is already where students learn.** They just lack the scaffolding and feedback of a real classroom.  
2. **Active learning works.** Studies show that learners who take notes, quiz themselves, and reflect retain information far better than passive viewers.  

Maddie is built to bridge those worlds — turning passive watching into active understanding.  

---

## What it does  

**Maddie** is a Chrome extension that transforms any YouTube playlist into an interactive, trackable course — powered entirely by on-device AI.  

Here’s how she helps you learn better:  

- 🎓 **Enroll in Playlists**: With one click, you can turn any YouTube playlist into a “course.” Maddie tracks your progress and completed videos.  
- 🧠 **AI Learning Toolkit**: As you watch, Maddie can instantly generate **notes** and **quizzes** from the video context — all locally, without sending your data anywhere.  
- 💬 **Ask Maddie Why**: Got a quiz question wrong? Click “Ask Maddie Why,” and she’ll explain why the correct answer makes sense — just like a real tutor.  
- 🔍 **Knowledge Search**: Search across everything you’ve learned. Ask, *“What did I learn about decision trees?”* — Maddie will find it across your notes and transcripts.  
- 🔒 **Completely Private**: All AI processing happens **on-device** using Chrome’s **Summarizer** and **Prompt APIs** — no API keys, no servers, no user tracking.  
- 🎯 **Seamless UX**: Maddie’s panel is minimal and native to YouTube — designed to feel invisible until you need it.  

In short, Maddie transforms YouTube from a place to *watch* into a place to *learn.*  

---

## How we built it  

Maddie is a **modular Chrome extension** built with:  

- **Frontend:** Svelte 4 (chosen for performance and lightweight DOM reactivity)  
- **AI:** Chrome’s **on-device Summarizer API** for instant note and quiz generation, and the **Prompt API** for conversational explanations  
- **Architecture:**  
  - **Content script** injects Maddie’s video panel directly into YouTube pages  
  - **Background service worker** handles transcript extraction, AI prompt orchestration, and caching  
  - **IndexedDB** stores enrolled courses, notes, flashcards, and quiz attempts  
  - **Dynamic video panel** powered by Svelte mounts seamlessly under the YouTube video player  

Key design goals:  
- No external servers or APIs — fully privacy-preserving  
- Native-feeling integration with minimal UI footprint  
- Reactive persistence: quiz states, user progress, and notes survive tab changes  

The workflow looks like this:  

1. Detect playlist → offer “Enroll” button  
2. Extract transcript (using fallback strategies for both auto-generated and uploaded captions)  
3. Process transcript locally with Summarizer API → notes  
4. Generate quiz schema using Prompt API → multiple-choice questions  
5. Persist results in local storage and update dashboard progress  

---

## Challenges we ran into  

1. **Transcript Extraction:**  
   YouTube doesn’t expose a clean transcript API, and auto-generated captions use multiple formats and access layers. Handling these inconsistencies across languages and layouts was the hardest engineering challenge.  

2. **Svelte 5 Compatibility:**  
   We initially tried building the UI with Svelte 5, but Chrome’s content script isolation broke Svelte’s `$state` reactivity. We reverted to Svelte 4 for stability.  

3. **TrustedHTML & CSP Restrictions:**  
   YouTube enforces strict content security policies. Injecting UI components sometimes threw `TrustedHTML` errors. We solved this with a secure script injection layer and a custom `TrustedTypePolicy`.  

4. **Persisting State Across Tabs:**  
   When users navigated between videos, the quiz state reset. We introduced a lightweight state synchronization mechanism using Chrome’s `storage.local` and reactive hydration on mount.  

5. **Balancing Minimalism and Power:**  
   The biggest design tradeoff was keeping Maddie helpful without overwhelming the YouTube interface. We iterated heavily on micro-interactions and visual hierarchy.  

---

## Accomplishments that we're proud of  

- Successfully used **on-device AI** (Summarizer + Prompt APIs) to create a fully functional learning companion — **no servers, no OpenAI keys.**  
- Built a **fluid, reactive UI** that feels native to YouTube.  
- Implemented a **personalized quiz system** with local grading and “Ask Maddie Why” explanations — our most delightful feature.  
- Designed a **persistent progress dashboard** that truly makes YouTube feel like a course platform.  
- Most of all, we made something that *feels human* — Maddie isn’t just an app, she’s a presence that helps you learn better.  

---

## What we learned  

- **Simplicity beats sophistication.** Early prototypes tried to do too much. The magic came from minimal, seamless integration.  
- **On-device AI is the future.** It’s faster, cheaper, and inherently private — an ideal model for educational tools.  
- **User experience is everything.** Even great AI features fail if they feel interruptive. By treating UX as part of the learning flow, not a layer above it, we built something users enjoy using.  
- **Good engineering is invisible.** The more Maddie blended into YouTube, the more natural she felt.  

---

## What's next for Maddie  

We see Maddie evolving into **the universal active learning layer for video education.**  

Next steps:  
- **Cross-platform expansion:** Support for Coursera, Udemy, and Skillshare.  
- **Collaborative learning:** Shared notes, quizzes, and progress with study partners.  
- **Adaptive learning engine:** Personalized quiz difficulty and content recommendations.  
- **Voice-based interaction:** “Hey Maddie, summarize this lecture for me.”  
- **Analytics dashboard:** Track learning time, retention, and growth insights.  

Our goal is to make learning from videos **as structured, measurable, and interactive** as a classroom — but infinitely more personal.  

---

> *“YouTube is the world’s biggest classroom. Maddie is a small attempt to make it close to a real one.”*

---