import { useState, useEffect } from "react";
import {
    Button,
    Card,
    Spinner,
    Tabs,
} from "../../components/ui";
import {
    AnimatedWrapper
} from "../../components/shared/AnimatedComponents";
import {
    PlayIcon,
    CheckCircleIcon,
    VideoCameraIcon,
    BookOpenIcon,
    SparklesIcon,
    TimerIcon,
    CalendarIcon,
    XCircleIcon,
    MagnifyingGlassIcon as SearchIcon
} from "../../components/Icons";
import { api } from "../../services/api";
import { useToast } from "../../components/ui";

const Learning = () => {
    const [videoId, setVideoId] = useState("");
    const [transcript, setTranscript] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quiz, setQuiz] = useState<any[] | null>(null);
    const [summary, setSummary] = useState("");
    const [error, setError] = useState("");
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("");
    const [availableLanguages, setAvailableLanguages] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [startTime, setStartTime] = useState(0);
    const [playerKey, setPlayerKey] = useState(0);
    const [activeMode, setActiveMode] = useState("YouTube");
    const [autoplayEnabled, setAutoplayEnabled] = useState(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
    const { addToast } = useToast();

    // Load history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const data = await api.getLearningSessions();
            setHistory(data);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    // Extract Video ID from URL or text
    const extractVideoId = (input: string) => {
        const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*\/v\/))([^?&"'>]+)/);
        return match ? match[1] : input;
    };

    const parseTimestamp = (ts: string) => {
        const match = ts.match(/\[?(\d+):(\d+)(?::(\d+))?\]?/);
        if (!match) return 0;
        const hrs = match[3] ? parseInt(match[1]) : 0;
        const mins = match[3] ? parseInt(match[2]) : parseInt(match[1]);
        const secs = match[3] ? parseInt(match[3]) : parseInt(match[2]);
        return hrs * 3600 + mins * 60 + secs;
    };

    const handleSeek = (ts: string) => {
        const seconds = parseTimestamp(ts);
        setStartTime(seconds);
        setAutoplayEnabled(true);
        setPlayerKey(prev => prev + 1); // Force iframe reload to start at new time
        addToast(`Seeking to ${ts}`, "info");
    };

    const handleFetchTranscript = async (langCode?: string) => {
        if (activeMode === "YouTube") {
            const id = extractVideoId(videoId);
            if (!id) {
                addToast("Please enter a valid YouTube Video ID or URL", "error");
                return;
            }

            setLoading(true);
            setError("");
            setTranscript(null);
            setQuiz(null);
            setUserAnswers({});
            setShowResults(false);
            setAvailableLanguages([]);

            try {
                const data = await api.getTranscript(id, langCode);
                setTranscript(data);
                if (data.summary) setSummary(data.summary);
                if (data.available_transcripts) {
                    setAvailableLanguages(data.available_transcripts);
                    const selected = data.available_transcripts.find((t: any) => t.selected);
                    if (selected) setSelectedLanguage(selected.language_code);
                }
                addToast("Transcript fetched successfully!", "success");
            } catch (err: any) {
                console.error(err);
                
                let displayMsg = "Failed to fetch transcript";
                try {
                    const match = err.message.match(/({.*})$/);
                    if (match) {
                        const parsed = JSON.parse(match[1]);
                        displayMsg = parsed.hint ? `${parsed.error} Hint: ${parsed.hint}` : parsed.error || displayMsg;
                    }
                } catch (e) {}

                setError(displayMsg);
                addToast(displayMsg, "error");
            } finally {
                setLoading(false);
            }
        } else {
            if (!videoFile) {
                addToast("Please select a video file first", "error");
                return;
            }

            setLoading(true);
            setError("");
            setTranscript(null);
            setQuiz(null);
            setUserAnswers({});
            setShowResults(false);

            try {
                const data = await api.uploadDeepgramTranscript(videoFile);
                setTranscript(data);
                if (data.summary) setSummary(data.summary);
                addToast("Video transcribed successfully!", "success");
            } catch (err: any) {
                console.error(err);
                
                let displayMsg = "Failed to transcribe video";
                try {
                    const match = err.message.match(/({.*})$/);
                    if (match) {
                        const parsed = JSON.parse(match[1]);
                        displayMsg = parsed.hint ? `${parsed.error} Hint: ${parsed.hint}` : parsed.error || displayMsg;
                    }
                } catch (e) {}

                setError(displayMsg);
                addToast(displayMsg, "error");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleGenerateQuiz = async (isTryMore = false) => {
        if (!transcript || !transcript.transcript) return;
        setQuizLoading(true);
        setError("");
        if (!isTryMore) setShowResults(false);
        if (!isTryMore) setSummary("");

        try {
            const data = await api.generateMCQs(transcript.transcript);
            if (isTryMore) {
                setQuiz(prevQuiz => {
                    const updated = [...(prevQuiz || []), ...data.mcqs];
                    return updated;
                });
                addToast("Added more questions!", "success");
            } else {
                setQuiz(data.mcqs);
                setSummary(data.summary);
                addToast("AI Quiz and Summary generated!", "success");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to generate quiz");
            addToast("Failed to generate quiz", "error");
        } finally {
            setQuizLoading(false);
        }
    };

    const handleSaveSession = async (updatedQuiz?: any[], score?: number, answers?: any, completed = false) => {
        try {
            let vidId = "";
            let title = "";
            let thumb = "";

            if (activeMode === "YouTube") {
                vidId = extractVideoId(videoId);
                title = transcript?.title || `Learning Session: ${vidId}`;
                thumb = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
            } else if (videoFile) {
                // For local videos, use a unique identifier based on filename
                vidId = `local_${videoFile.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                title = videoFile.name;
                thumb = "https://cdn-icons-png.flaticon.com/512/1179/1179069.png"; // Video placeholder
            } else {
                addToast("No video source to save", "error");
                return;
            }

            if (!vidId) {
                addToast("Invalid Video Source", "error");
                return;
            }

            await api.saveLearningSession({
                videoId: vidId,
                videoTitle: title,
                thumbnail: thumb,
                summary,
                quiz: updatedQuiz || quiz || [],
                userProgress: {
                    score: score ?? calculateScore(),
                    totalQuestions: (updatedQuiz || quiz || []).length,
                    answers: answers ?? userAnswers,
                    isCompleted: completed
                }
            });
            fetchHistory(); // Refresh history
            if (completed) addToast("Session completed and saved!", "success");
            else addToast("Progress saved!", "success");
        } catch (err) {
            console.error("Failed to save session", err);
            addToast("Failed to save progress", "error");
        }
    };

    const handleLoadSession = (session: any) => {
        setVideoId(session.videoId);
        setSummary(session.summary);
        setQuiz(session.quiz);
        setUserAnswers(session.userProgress?.answers || {});
        setShowResults(session.userProgress?.isCompleted || false);
        setTranscript(null); // Clear transcript to show the quiz view
        setIsSidebarOpen(false);
        addToast("Session loaded!", "info");
    };


    const handleAnswerSelect = (questionIndex: number, option: string) => {
        if (showResults) return;
        const newAnswers = { ...userAnswers, [questionIndex]: option };
        setUserAnswers(newAnswers);
    };

    const calculateScore = (answers?: any, currentQuiz?: any[]) => {
        const qList = currentQuiz || quiz;
        if (!qList) return 0;
        const ansMap = answers || userAnswers;
        let correct = 0;
        qList.forEach((q, idx) => {
            if (ansMap[idx]?.trim() === q.correct_answer?.trim()) correct++;
        });
        return correct;
    };

    const currentId = extractVideoId(videoId);

    return (
        <>
            {/* Top Left Floating Toggle - Below Navbar (h-16) */}
            {!isSidebarOpen && (
                <div className="fixed left-0 top-20 z-40 animate-in fade-in slide-in-from-left-2">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex items-center gap-0 pl-0 pr-4 py-2.5 rounded-l-none rounded-r-2xl bg-[var(--surface)] border border-[var(--border)] border-l-0 shadow-[10px_0_30px_rgba(0,0,0,0.1)] hover:shadow-[15px_0_40px_rgba(0,0,0,0.15)] hover:bg-[var(--surface-2)] transition-all text-sm font-black text-[var(--text)] group"
                    >
                        <div className="w-10 h-8 flex items-center justify-center">
                            <CalendarIcon className="w-6 h-6 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-500 whitespace-nowrap overflow-hidden ml-0">
                            Past Learnings ({history.length})
                        </span>
                    </button>
                </div>
            )}

            {/* Sidebar Overlay - Transparent */}
            <div
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar Drawer - Starting below Header (h-16) */}
            <div className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-[420px] max-w-[95vw] shadow-2xl z-[500] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 invisible pointer-events-none'}`}>
                <div className="flex flex-col h-full bg-[var(--surface-3)] border-r border-[var(--border)] shadow-xl">
                    <div className="py-4 pr-4 pl-0 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-[var(--accent)]" />
                            <h3 className="text-lg font-bold">Past Learnings</h3>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-1 hover:bg-[var(--surface-3)] rounded-lg transition-colors group"
                        >
                            <XCircleIcon className="w-8 h-8 text-[var(--text-muted)] group-hover:text-red-500" />
                        </button>
                    </div>

                    {/* Search - Integrated */}
                    <div className="py-4 pr-4 pl-0 bg-[var(--surface-3)]">
                        <div className="relative">
                            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search tutorials..."
                                className="w-full pl-10 pr-4 py-2 text-sm border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white"
                            />
                        </div>
                    </div>

                    <div className="py-4 pr-4 pl-0 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                        {history.filter(item =>
                            item.videoTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.videoId?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 opacity-20">
                                <PlayIcon className="w-16 h-16 mb-2" />
                                <p className="text-sm font-medium">Ready for search</p>
                            </div>
                        ) : (
                            history
                                .filter(item =>
                                    item.videoTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    item.videoId?.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((item, idx) => (
                                    <Card
                                        key={idx}
                                        onClick={() => handleLoadSession(item)}
                                        className="group cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all overflow-hidden bg-white border-4 border-black shadow-[var(--shadow-sm)]"
                                    >
                                        <div className="aspect-video relative overflow-hidden bg-black">
                                            <img
                                                src={item.thumbnail || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                                                alt="Thumbnail"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayIcon className="w-10 h-10 text-white" />
                                            </div>
                                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[8px] font-bold text-white uppercase tracking-widest">
                                                {item.userProgress?.score}/{item.userProgress?.totalQuestions} Correct
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-1">
                                            <h4 className="text-sm font-bold leading-tight line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                                                {item.videoTitle}
                                            </h4>
                                            <div className="flex items-center justify-between items-end pt-1">
                                                <span className="text-[10px] text-[var(--text-muted)]">
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                                                </span>
                                                {item.userProgress?.isCompleted && (
                                                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">Completed</span>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))
                        )}
                    </div>
                </div>
            </div>

            <AnimatedWrapper className="space-y-8 max-w-[1400px] mx-auto pb-12 px-4">
                {/* Header Section */}
                <div className="text-center space-y-4 pt-4 px-2">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-black leading-tight">
                        Learn With <span className="bg-[var(--nb-yellow)] px-2 border-4 border-black shadow-[var(--shadow-sm)] inline-block transform -rotate-2">AI Powers</span>
                    </h2>
                </div>

                <div className="flex justify-center">
                    <Tabs 
                        tabs={["YouTube", "Local Video"]} 
                        activeTab={activeMode} 
                        setActiveTab={(tab) => {
                            setActiveMode(tab);
                            setTranscript(null);
                            setQuiz(null);
                            setError("");
                            if (tab === "YouTube") {
                                setLocalVideoUrl(null);
                                setVideoFile(null);
                            }
                        }} 
                    />
                </div>

                {/* Input Card */}
                <Card className="p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--nb-pink)] rounded-full -mr-16 -mt-16 border-4 border-black shadow-[var(--shadow-sm)]" />
                    <div className="relative flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            {activeMode === "YouTube" ? (
                                <>
                                    <PlayIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 opacity-50" />
                                    <input
                                        type="text"
                                        placeholder="Paste YouTube Link or Video ID"
                                        className="w-full pl-12 pr-4 py-4 border-4 border-black font-black text-lg focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white"
                                        value={videoId}
                                        onChange={(e) => setVideoId(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFetchTranscript()}
                                    />
                                </>
                            ) : (
                                <div className="relative w-full border-4 border-black bg-white p-4 h-full flex items-center">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        className="w-full font-black text-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:border-4 file:border-black file:bg-[var(--nb-yellow)] file:text-black file:font-black hover:file:bg-[var(--nb-blue)] hover:file:text-white"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setVideoFile(file);
                                            if (file) {
                                                setLocalVideoUrl(URL.createObjectURL(file));
                                            } else {
                                                setLocalVideoUrl(null);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={() => handleFetchTranscript()}
                            disabled={loading || (activeMode === "YouTube" ? !videoId : !videoFile)}
                            className="py-4 px-8"
                        >
                            {loading ? <Spinner /> : (activeMode === "YouTube" ? "Start Learning" : "Transcribe Video")}
                        </Button>
                    </div>
                </Card>

                {/* Error Message */}
                {error && (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        {error}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="min-h-[400px]">
                    {loading && (
                        <div className="flex flex-col items-center justify-center p-20 space-y-4 text-[var(--text-muted)]">
                            <Spinner />
                            <p className="animate-pulse font-medium">Connecting to YouTube services...</p>
                        </div>
                    )}

                    {/* Transcript State */}
                    {transcript && !quiz && !loading && (
                        <AnimatedWrapper className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black uppercase text-black flex items-center gap-3">
                                    <VideoCameraIcon className="w-8 h-8 text-[var(--nb-pink)]" />
                                    Video Transcript
                                </h3>
                                <Button onClick={() => handleGenerateQuiz()} disabled={quizLoading}>
                                    {quizLoading ? <Spinner /> : <><SparklesIcon className="w-4 h-4" /> Generate Quiz</>}
                                </Button>
                            </div>

                            {summary && (
                                <Card className="p-6 bg-[var(--nb-yellow)] border-4 border-black shadow-[var(--shadow-sm)] animate-in fade-in slide-in-from-top-4">
                                    <h4 className="text-lg font-black uppercase text-black mb-3 flex items-center gap-2">
                                        <BookOpenIcon className="w-6 h-6" /> Key Learnings (Summary)
                                    </h4>
                                    <p className="text-base font-bold text-black opacity-90">
                                        {summary}
                                    </p>
                                </Card>
                            )}

                            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 min-h-[400px]">
                                <div className="bg-black w-full h-full overflow-hidden border-4 border-black shadow-[var(--shadow-sm)] relative aspect-video lg:aspect-auto">
                                    {activeMode === "YouTube" ? (
                                        <iframe
                                            key={playerKey}
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${currentId}?start=${startTime}&autoplay=${autoplayEnabled ? 1 : 0}`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                        ></iframe>
                                    ) : (
                                        localVideoUrl && (
                                            <video 
                                                id="localVideoPlayer"
                                                src={localVideoUrl}
                                                controls 
                                                autoPlay={autoplayEnabled}
                                                className="w-full h-full object-contain"
                                                onTimeUpdate={() => {
                                                    // Synchronize any highlighting if needed
                                                }}
                                            />
                                        )
                                    )}
                                </div>

                                <div className="border-4 border-black bg-[var(--surface)] flex flex-col overflow-y-auto shadow-[var(--shadow-sm)] bg-white max-h-[500px] lg:h-[600px]">
                                    <div className="p-4 border-b-4 border-black bg-[var(--nb-pink)] flex items-center justify-between">
                                        <span className="text-sm font-black uppercase text-black">Interactive Log</span>
                                        {availableLanguages.length > 0 && (
                                            <select
                                                value={selectedLanguage}
                                                onChange={(e) => handleFetchTranscript(e.target.value)}
                                                className="bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded px-2 py-1 text-xs"
                                            >
                                                {availableLanguages.map((lang: any) => (
                                                    <option key={lang.language_code} value={lang.language_code}>
                                                        {lang.language_code.toUpperCase()}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                                         {transcript.transcript?.map((item: any, idx: number) => (
                                            <button key={idx}
                                                onClick={() => {
                                                    if (activeMode === "YouTube") {
                                                        handleSeek(item.start_time_text);
                                                    } else {
                                                        const video = document.getElementById('localVideoPlayer') as HTMLVideoElement;
                                                        if (video) {
                                                            video.currentTime = parseTimestamp(item.start_time_text);
                                                            video.play();
                                                        }
                                                    }
                                                }}
                                                className="w-full text-left flex gap-4 group/item hover:bg-[var(--surface-2)] p-2 rounded-lg transition-colors border border-transparent hover:border-[var(--border)]"
                                            >
                                                <span className="shrink-0 text-xs font-mono font-black px-2 py-1 bg-[var(--nb-yellow)] border-2 border-black text-black">
                                                    {item.start_time_text}
                                                </span>
                                                <p className="text-sm opacity-80 group-hover/item:opacity-100">
                                                    {item.snippet}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </AnimatedWrapper>
                    )}

                    {/* Split Screen Quiz View */}
                    {/* Split Screen Quiz View */}
                    {quiz && !quizLoading && (
                        <div className="flex flex-col gap-12 relative pb-20">
                            <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                                 {/* Left Column: Video & Key Learnings */}
                                <div className="w-full lg:w-[45%] flex flex-col space-y-6">
                                    <div className="bg-black aspect-video overflow-hidden border-4 border-black shadow-[var(--shadow-sm)] relative shrink-0">
                                        {activeMode === "YouTube" ? (
                                            <iframe 
                                                key={playerKey}
                                                width="100%" 
                                                height="100%" 
                                                src={`https://www.youtube.com/embed/${currentId}?start=${startTime}&autoplay=${autoplayEnabled ? 1 : 1}`}
                                                title="YouTube video player" 
                                                frameBorder="0" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                                allowFullScreen
                                            ></iframe>
                                        ) : (
                                            localVideoUrl && (
                                                <video 
                                                    id="localVideoPlayerResults"
                                                    src={localVideoUrl}
                                                    controls 
                                                    autoPlay={autoplayEnabled}
                                                    className="w-full h-full object-contain"
                                                />
                                            )
                                        )}
                                    </div>

                                    {summary && (
                                        <Card className="flex-1 p-6 bg-[var(--nb-yellow)] border-4 border-black shadow-[var(--shadow-sm)]">
                                            <h4 className="text-lg font-black uppercase text-black mb-3 flex items-center gap-2">
                                                <BookOpenIcon className="w-6 h-6" /> Key Learnings
                                            </h4>
                                            <p className="text-base font-bold text-black opacity-90">
                                                {summary}
                                            </p>
                                        </Card>
                                    )}
                                    
                                    <Button variant="secondary" onClick={() => setQuiz(null)} className="w-full shadow-md shrink-0">
                                        Back to Full Transcript
                                    </Button>
                                </div>

                            {/* Right Column: Scrollable Quiz - Matches height of Left Column */}
                            <div className="w-full lg:w-[55%] relative min-h-[500px]">
                                <div className="lg:absolute lg:inset-0 lg:overflow-y-auto pr-4 custom-scrollbar space-y-6 pb-8">
                                    <div className="flex items-center justify-between sticky top-0 py-4 z-30 border-b-4 border-black bg-white -mt-2 px-4">
                                        <h3 className="text-2xl font-black uppercase text-black flex items-center gap-2">
                                            <SparklesIcon className="w-8 h-8 text-[var(--nb-pink)]" />
                                            Knowledge Check
                                        </h3>
                                        <div className="px-3 py-1 bg-[var(--nb-pink)] text-black border-2 border-black font-black">
                                            {Object.keys(userAnswers).length} / {quiz.length} Answered
                                        </div>
                                    </div>

                                        <div className="space-y-6 pt-2">
                                            {quiz.map((q, idx) => (
                                            <Card key={idx} className="p-6 space-y-4 border-4 border-black bg-white shadow-[var(--shadow-sm)]">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 bg-[var(--nb-blue)] text-white border-4 border-black flex items-center justify-center font-black shrink-0 text-xl">
                                                            {idx + 1}
                                                        </div>
                                                        <h4 className="text-xl font-black uppercase text-black">{q.question}</h4>
                                                    </div>
                                                     <button 
                                                        onClick={() => {
                                                            if (activeMode === "YouTube") {
                                                                handleSeek(q.source_timestamp);
                                                            } else {
                                                                const video = document.getElementById('localVideoPlayerResults') as HTMLVideoElement;
                                                                if (video) {
                                                                    video.currentTime = parseTimestamp(q.source_timestamp);
                                                                    video.play();
                                                                }
                                                            }
                                                        }}
                                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-[var(--nb-yellow)] text-black font-black border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[var(--shadow-sm)]"
                                                    >
                                                        <TimerIcon className="w-4 h-4" />
                                                        {q.source_timestamp}
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    {q.options.map((option: string, oIdx: number) => {
                                                        const isSelected = userAnswers[idx] === option;
                                                        const isCorrect = option.trim() === q.correct_answer?.trim();
                                                        const showFeedback = showResults;

                                                        let stateClass = "border-4 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[var(--shadow-sm)] bg-white text-black";
                                                        if (isSelected) stateClass = "border-4 border-black bg-[var(--nb-pink)] translate-x-1 translate-y-1 shadow-none text-black";
                                                        
                                                        if (showFeedback) {
                                                            if (isCorrect) stateClass = "bg-green-400 border-4 border-black text-black font-black shadow-none";
                                                            else if (isSelected) stateClass = "bg-red-400 border-4 border-black text-black font-black shadow-none";
                                                            else stateClass = "opacity-40 grayscale";
                                                        }

                                                        return (
                                                            <button
                                                                key={oIdx}
                                                                onClick={() => handleAnswerSelect(idx, option)}
                                                                disabled={showResults}
                                                                className={`p-4 text-left font-bold transition-all flex items-center justify-between ${stateClass}`}
                                                            >
                                                                <span className="text-base">{option}</span>
                                                                {showFeedback && isCorrect && <CheckCircleIcon className="w-6 h-6 text-black" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {showResults && (
                                                    <div className="p-4 bg-[var(--nb-yellow)] border-4 border-black">
                                                        <p className="text-base font-black text-black uppercase tracking-wider mb-1">Teacher's Note</p>
                                                        <p className="text-sm font-bold text-black">{q.explanation}</p>
                                                    </div>
                                                )}
                                            </Card>
                                        ))}
                                        </div>

                                        <div className="flex justify-center pt-4">
                                            <Button 
                                                variant="secondary" 
                                                onClick={() => handleGenerateQuiz(true)} 
                                                disabled={quizLoading}
                                                className="w-full py-4 text-base"
                                            >
                                                {quizLoading ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Try More Questions</>}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Centered Check Answers / Score Card - Positioned Below sections row */}
                            <div className="flex justify-center w-full">
                                {!showResults ? (
                                    <Button 
                                        onClick={() => {
                                            setShowResults(true);
                                            const score = calculateScore();
                                            addToast(`Checkpoint Complete! Result: ${score}/${quiz.length}`, score > quiz.length/2 ? "success" : "info");
                                        }}
                                        disabled={Object.keys(userAnswers).length < quiz.length}
                                        className="px-10 py-6 text-xl"
                                    >
                                        Check My Answers
                                    </Button>
                                ) : (
                                    <Card className="px-10 py-6 border-4 border-black bg-white shadow-[var(--shadow-md)] flex flex-col sm:flex-row items-center gap-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 border-4 border-black bg-[var(--nb-pink)] text-black flex flex-col items-center justify-center">
                                                <span className="text-2xl font-black leading-none">{calculateScore()}</span>
                                                <span className="text-[10px] font-black uppercase">SCORE</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-black uppercase text-black">Checkpoint Complete!</span>
                                                <span className="text-sm font-bold text-black opacity-80">{calculateScore() === quiz.length ? "Mastered perfectly! ✨" : "Good progress, keep learning!"}</span>
                                            </div>
                                        </div>
                                        <div className="h-10 w-1 bg-black hidden sm:block" />
                                        <Button 
                                            onClick={() => handleSaveSession(quiz, calculateScore(), userAnswers, true)}
                                        >
                                            Save Learning & Finish
                                        </Button>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </AnimatedWrapper>
        </>
    );
};

export default Learning;
