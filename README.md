# IntelliClass

IntelliClass is a modern, AI-powered academic platform designed to streamline the educational experience for students, teachers, and administrators. It leverages artificial intelligence to automate assessment creation and provides real-time collaborative features for enhanced classroom engagement.

## Core Tech Stack

- **MERN Stack**: Built on MongoDB, Express, React, and Node.js for a robust, full-stack foundation.
- **Google Gemini AI**: Powers the AI Teaching Assistant for automated quiz generation and study material summarization.
- **Socket.io**: Enables real-time features including live leaderboards, instant notifications, and interactive discussions.
- **Deepgram API**: High-accuracy speech-to-text engine for converting recorded audio into searchable transcripts.
- **SerpApi**: Facilitates synchronized YouTube search and transcript fetching for video-based learning modules.
- **Tailwind CSS (v4)**: Implements a fully responsive, high-contrast Neo-Brutalist design system.
- **Jitsi Meet**: Integrated open-source video conferencing for virtual classrooms.

## Role-Based Features

### Administrator
- Comprehensive user management for student and teacher accounts.
- Institutional oversight including subject categorization and course structure management.
- Platform-wide academic analytics and security audit logs.
- Global monitoring of resources, quizzes, and active classrooms.

### Teacher
- Dynamic MCQ Engine with support for time limits, custom conditions, and automated grading.
- Document Digitization: Automatic parsing of Word (.docx) and PowerPoint (.pptx) files into study materials.
- Managed Classrooms: Dedicated virtual spaces for resource distribution and live meetings.
- Real-time Polls: Instant classroom feedback through live polling systems.

### Student
- Personalized Dashboard: Graphical progress tracking with performance analytics.
- AI Study Assistant: Automated MCQ generation and summarization from study materials.
- Global Leaderboard: Competitive ranking system based on quiz achievements.
- Synced Video Learning: Interactive tutorials featuring auto-scrolling transcripts.

## Project Structure

```text
react_quiz/
├── frontend/     # React.js (Vite) application
└── backend/      # Node.js (Express) server
```

## Deployment

The platform is optimized for production deployment:
- **Frontend**: Hosted on Vercel with SPA routing enabled.
- **Backend**: Hosted on Render to maintain persistent WebSocket (Socket.io) connections.

## Local Configuration

To run the project locally:

1.  **Backend**:
    - Navigate to `/backend`.
    - Run `npm install`.
    - Configure `.env` with `MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET`, and `ENCRYPT_KEY`.
    - Run `npm start`.

2.  **Frontend**:
    - Navigate to `/frontend`.
    - Run `npm install`.
    - Configure `.env` with `VITE_API_BASE_URL`, `VITE_API_KEY`, and `VITE_DEEPGRAM_API_KEY`.
    - Run `npm run dev`.