import type { Quiz, QuizResult, Resource, DiscussionPost } from '../types';

export const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

async function request(path: string, opts: RequestInit = {}) {
    // attach Authorization header if token is stored in localStorage currentUser
    const stored = localStorage.getItem('currentUser');
    let token: string | null = null;
    try {
        const parsed = stored ? JSON.parse(stored) : null;
        token = parsed?.token || null;
    } catch (e) {
        token = null;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        // Log warning for protected routes when token is missing
        const isAuthRoute = path.includes('/api/classrooms') ||
            path === '/api/users' ||
            path === '/api/quizzes' ||
            path === '/api/resources' ||
            path === '/api/posts' ||
            path === '/api/results' ||
            path === '/api/assignments';

        if (isAuthRoute) {
            console.warn(`Auth required but token missing for: ${path}. User may need to re-login.`);
        }
    }

    const res = await fetch(`${BASE}${path}`, {
        headers,
        ...opts,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${path} failed: ${res.status} ${res.statusText} ${text}`);
    }
    // Some endpoints may return empty body
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    return null;
}

export const api = {
    health: async () => {
        try {
            await request('/api/health');
            return true;
        } catch (e) {
            return false;
        }
    },
    getUsers: () => request('/api/users'),
    getQuizzes: () => request('/api/quizzes'),
    getQuiz: (id: string) => request(`/api/quizzes/${id}`),
    addQuiz: (quiz: Partial<Quiz>) => request('/api/quizzes', { method: 'POST', body: JSON.stringify(quiz) }),
    createQuizWithAssignment: (payload: any) => request('/api/create-quiz', { method: 'POST', body: JSON.stringify(payload) }),
    updateQuiz: (id: string, data: { title?: string, pool?: any[] }) => request(`/api/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteQuiz: (id: string) => request(`/api/quizzes/${id}`, { method: 'DELETE' }),
    submitQuizResult: (quizId: string, payload: Partial<QuizResult>) => request(`/api/quizzes/${quizId}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
    getResults: () => request('/api/results').catch(() => []),
    getUserAnalytics: (userId: string) => request(`/api/users/${userId}/analytics`),
    getAssignments: () => request('/api/assignments').catch(() => []),
    createAssignment: (payload: { quizId: string; studentIds: string[]; deadline?: string; timeLimit?: number; numQuestionsToAssign?: number; isLive?: boolean; }) => request('/api/assignments', { method: 'POST', body: JSON.stringify(payload) }),
    getAssignmentByQuiz: (quizId: string) => request(`/api/assignments/by-quiz/${quizId}`),
    updateAssignmentByQuiz: (quizId: string, payload: { studentIds: string[]; deadline?: string; timeLimit?: number; isLive?: boolean; }) => request(`/api/assignments/by-quiz/${quizId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    getResources: () => request('/api/resources'),
    addResource: (r: Partial<Resource>) => request('/api/resources', { method: 'POST', body: JSON.stringify(r) }),
    getPosts: () => request('/api/posts'),
    getPost: (id: string) => request(`/api/posts/${id}`),
    addPost: (p: Partial<DiscussionPost>) => request('/api/discussions', { method: 'POST', body: JSON.stringify(p) }),
    addReply: (postId: string, reply: any) => request(`/api/discussions/reply`, { method: 'POST', body: JSON.stringify({ postId, optimistic: reply }) }),
    updateUserPassword: (userId: string, password: string) => request(`/api/users/${userId}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
    // Polls
    getPolls: () => request('/api/polls'),
    createPoll: (payload: any) => request('/api/polls', { method: 'POST', body: JSON.stringify(payload) }),
    startPoll: (pollId: string, timeLimitSeconds?: number) => request(`/api/polls/${pollId}/start`, { method: 'POST', body: JSON.stringify({ timeLimitSeconds }) }),
    votePoll: (pollId: string, optionIndex: number, userId?: string) => request(`/api/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ optionIndex, userId }) }),
    getPollSession: (pollId: string) => request(`/api/polls/${pollId}/session`),
    advancePoll: (pollId: string, timeLimitSeconds?: number) => request(`/api/polls/${pollId}/next`, { method: 'POST', body: JSON.stringify({ timeLimitSeconds }) }),
    // poll assignments
    assignPoll: (pollId: string, payload: { studentIds: string[]; deadline?: string; timeLimit?: number; isLive?: boolean }) => request(`/api/polls/${pollId}/assign`, { method: 'POST', body: JSON.stringify(payload) }),
    getPollAssignment: (pollId: string) => request(`/api/polls/assignments/by-poll/${pollId}`),
    getAssignedPolls: () => request('/api/polls/assigned'),
    deletePoll: (pollId: string) => request(`/api/polls/${pollId}`, { method: 'DELETE' }),
    // Classrooms
    getClassrooms: () => request('/api/classrooms'),
    getClassroom: (id: string) => request(`/api/classrooms/${id}`),
    createClassroom: (payload: { name: string; description?: string; studentIds?: string[] }) => request('/api/classrooms', { method: 'POST', body: JSON.stringify(payload) }),
    joinClassroom: (classCode: string) => request('/api/classrooms/join', { method: 'POST', body: JSON.stringify({ classCode }) }),
    getClassroomResources: (id: string) => request(`/api/classrooms/${id}/resources`),
    uploadClassroomResource: (classroomId: string, formData: FormData) => fetch(`${BASE}/api/classrooms/${classroomId}/resources`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('currentUser') || '{}').token || ''}`
        },
        body: formData
    }).then(res => res.json()),
    startMeeting: (id: string) => request(`/api/classrooms/${id}/start-meeting`, { method: 'POST' }),
    endMeeting: (id: string) => request(`/api/classrooms/${id}/end-meeting`, { method: 'POST' }),
    async getYouTubeResults(query: string): Promise<any[]> {
        const res = await fetch(`${BASE}/api/youtube/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Failed to search YouTube");
        return res.json();
    },

    // --- Learning Persistence ---
    async saveLearningSession(data: {
        videoId: string,
        videoTitle?: string,
        thumbnail?: string,
        summary?: string,
        quiz?: any[],
        userProgress?: any
    }): Promise<any> {
        return request('/api/learning/save', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    getLearningSessions: () => request('/api/learning/sessions'),

    getLearningSessionById: (id: string) => request(`/api/learning/session/${id}`),
    getTranscript: (videoId: string, langCode?: string) => {
        const params = new URLSearchParams({ v: videoId });
        if (langCode) params.append('lc', langCode);
        return request(`/api/transcript?${params.toString()}`);
    },
    generateMCQs: (transcript: any[]) => request('/api/generate-mcqs', { method: 'POST', body: JSON.stringify({ transcript }) }),

    async uploadDeepgramTranscript(file: File) {
        // 1. Package the file using FormData
        const formData = new FormData();
        formData.append("file", file);

        // Access token if exists
        const stored = localStorage.getItem('currentUser');
        const token = stored ? JSON.parse(stored)?.token : null;

        // 2. Send it securely to OUR backend
        const res = await fetch(`${BASE}/api/upload-audio`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: formData,
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Failed to upload to Deepgram API via proxy: ${res.status} ${errText}`);
        }

        // 3. Receive the fully processed transcript and summary from our backend
        return res.json();
    }
};

export default api;