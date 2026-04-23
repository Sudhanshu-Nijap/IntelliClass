# IntelliClass

IntelliClass is a **High-Performance, Privacy-Conscious Learning Management System (LMS)** designed to bridge the gap between educational content and student engagement. Built with a focus on automation and data sovereignty, it replaces traditional LLM-dependency with a high-precision, **custom rule-based NLP and algorithmic engine**.

## 🚀 Key Highlights

- **Privacy-First Architecture**: Implements **AES-256 encryption** for all assessment data (questions, options, and results) at rest, ensuring academic integrity and data privacy.
- **Custom NLP Engine**: Leverages the `natural` language processing library for high-speed, local MCQ generation and content summarization, eliminating the need for external AI API calls.
- **Automated Workflows**: Integrated with **n8n** to handle complex event-driven tasks like automated quiz assignment notifications and gradebook sync.
- **Real-time Engagement**: Powered by **Socket.io** for live leaderboards, instant classroom notifications, and synchronous discussion forums.

---

## 🛠️ Core Technology Stack

### Backend (Node.js & Express)
- **Database**: MongoDB (Mongoose ODM) with encrypted fields.
- **NLP & Logic**: `Natural` NLP, custom regex-based parsing, and algorithmic quiz generation.
- **Security**: AES-256 encryption (`aes256`), JWT authentication, and Bcrypt password hashing.
- **Real-time**: Socket.io namespaces for segmented event handling (Leaderboard, Assignments, Discussions).
- **Transcription**: Deepgram SDK v5 for high-accuracy speech-to-text.
- **Parsing**: `Mammoth` (.docx), `pdf-parse`, and `XLSX` for multi-format document digitization.

### Frontend (React & Vite)
- **UI/UX**: Tailwind CSS (v4) with a modern, high-contrast design system.
- **Animations**: Framer Motion for smooth micro-animations and transitions.
- **State Management**: React Hooks & Context API.
- **Visualization**: Recharts for performance analytics and student progress tracking.

---

## 🎭 Role-Based Feature Set

### 🛡️ Administrator
- **Advanced User Control**: Manage student/teacher lifecycle and permissions.
- **Audit Logs**: Monitor platform-wide resource allocation and security status.
- **Analytics**: High-level institutional performance oversight.

### 🎓 Teacher
- **Automated MCQ Engine**: Convert uploaded documents (.docx, .pdf, .pptx) or YouTube URLs into structured quizzes instantly.
- **Smart Classrooms**: Create dedicated virtual spaces with integrated Jitsi video meetings.
- **Live Polling**: Real-time interactive sessions with instant result visualization.
- **Resource Management**: Distribute materials with granular access controls.

### 📝 Student
- **Interactive Dashboard**: Track points, ranking, and topic-specific performance.
- **Smart Video Learning**: Synchronized YouTube playback with auto-scrolling transcripts and search.
- **Global Leaderboard**: Gamified competitive ranking based on academic achievements.
- **Unified Discussions**: Collaborate on topics with real-time reply notifications.

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local instance
- Deepgram API Key (for transcription)
- SerpApi Key (for video search)

### Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Sudhanshu-Nijap/IntelliClass.git
    cd IntelliClass
    ```

2.  **Backend Setup**:
    ```bash
    cd backend
    npm install
    # Create a .env file with:
    # MONGODB_URI, JWT_SECRET, ENCRYPT_KEY, DEEPGRAM_API_KEY, SERP_API_KEY, N8N_WEBHOOK_URL
    npm run dev
    ```

3.  **Frontend Setup**:
    ```bash
    cd ../frontend
    npm install
    # Create a .env file with:
    # VITE_API_BASE_URL=http://localhost:8080
    npm run dev
    ```

---

## 🔒 Security & Compliance
IntelliClass is built for environments where data sensitivity is paramount. By utilizing local NLP processing and military-grade encryption, we ensure that educational data never leaves your controlled environment for training third-party models.

---