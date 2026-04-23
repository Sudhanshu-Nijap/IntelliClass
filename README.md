# 🎓 IntelliClass

**IntelliClass** is a high-performance, privacy-conscious Learning Management System (LMS) designed to optimize student and teacher productivity through advanced automation and real-time analytics. Unlike traditional platforms, IntelliClass leverages **custom algorithmic engines** and **rule-based NLP** to provide a secure, fast, and highly engaging educational experience.

---

## 🚀 Key Features

### 🧠 Algorithmic Quiz Engine
*   **Automated MCQ Generation**: Uses custom NLP logic (TF-IDF and Porter Stemming) to extract key concepts from study materials and transcripts to generate relevant quizzes instantly.
*   **Context-Aware Scoring**: An algorithmic scoring system evaluates sentence quality to ensure high-relevance assessment questions.

### 🤖 Rule-Based Smart Assistant
*   **Privacy-First Insights**: A personal study assistant that uses **Levenshtein Distance fuzzy matching** to answer student queries about their performance, strengths, and weaknesses.
*   **Intent Dispatcher**: Advanced logic to understand student goals (stats, history, topic mastery) without sending data to external LLMs.

### 📡 Real-Time Engagement
*   **Live Dashboards**: Interactive student and teacher dashboards powered by **Socket.io** for instant performance updates.
*   **Global Leaderboard**: Gamified ranking system to foster healthy competition among students.
*   **Live Polls & Discussions**: Instant classroom feedback and collaborative discussion boards.

### ⚙️ Workflow Automation
*   **n8n Integration**: Automated email notification system for quiz assignments, submissions, and grading alerts.
*   **Document Digitization**: Seamless conversion of `.docx`, `.pptx`, and video transcripts into searchable study resources.

---

## 🛠️ Tech Stack

### **Frontend**
*   **Framework**: React 19 (Vite)
*   **Styling**: Tailwind CSS v4 (Neo-Brutalist Design System)
*   **Animations**: Framer Motion
*   **Real-time**: Socket.io-client
*   **Charts**: Recharts

### **Backend**
*   **Runtime**: Node.js & Express
*   **Database**: MongoDB (Mongoose)
*   **NLP Engine**: Natural (Tokenizers, Stemmers, TF-IDF)
*   **Real-time**: Socket.io
*   **Automation**: n8n Webhooks

### **APIs & Services**
*   **Deepgram**: High-precision speech-to-text for video transcription.
*   **SerpApi**: Synchronized YouTube search and resource discovery.
*   **Jitsi**: Integrated open-source video conferencing.

---

## 🎨 Design Philosophy
IntelliClass features a **Premium Neo-Brutalist** aesthetic, characterized by high-contrast colors, bold borders, and smooth micro-animations. This design ensures clarity, focus, and a modern feel that keeps students engaged.

---

## 📦 Project Structure
```text
IntelliClass/
├── frontend/     # React.js application
├── backend/      # Node.js server & NLP logic
└── n8n/          # Automation workflow exports
```

---

## 🛠️ Installation & Setup

### 1. Backend Setup
1.  Navigate to `/backend`.
2.  Run `npm install`.
3.  Create a `.env` file with:
    ```env
    PORT=8080
    MONGODB_URI=your_mongodb_uri
    JWT_SECRET=your_secret
    ENCRYPT_KEY=your_key
    ```
4.  Run `npm start`.

### 2. Frontend Setup
1.  Navigate to `/frontend`.
2.  Run `npm install`.
3.  Create a `.env` file with:
    ```env
    VITE_API_BASE_URL=http://localhost:8080
    VITE_DEEPGRAM_API_KEY=your_key
    ```
4.  Run `npm run dev`.

---

## 🛡️ Privacy & Performance
By utilizing custom rule-based algorithms instead of large language models, IntelliClass ensures:
1.  **Zero Latency**: Instant response times for quiz generation and assistant queries.
2.  **Data Sovereignty**: Student data never leaves the platform's secure environment.
3.  **Reliability**: No dependency on external AI API uptime or cost fluctuations.