import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../services/api';
import { Card, Button } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    role: 'bot' | 'user';
    content: string;
}

export const SmartAssistant: React.FC = () => {
    const { currentUser } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', content: "Hi! I'm your personal study assistant. Ask me about your quiz count, marks in a topic, or your strengths!" }
    ]);
    const [input, setInput] = useState("");
    const [analytics, setAnalytics] = useState<any>(null);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial fetch of the 3-query analytics
    useEffect(() => {
        if (currentUser && isOpen && !analytics) {
            const fetchAnalytics = async () => {
                try {
                    const data = await api.getUserAnalytics(currentUser._id || currentUser.id);
                    setAnalytics(data);
                } catch (err) {
                    console.error("Assistant data fetch failed:", err);
                }
            };
            fetchAnalytics();
        }
    }, [currentUser, isOpen, analytics]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // --- ALGORITHM START ---
    // Levenshtein Distance for fuzzy matching
    const getLevenshteinDistance = (s: string, t: string): number => {
        if (!s.length) return t.length;
        if (!t.length) return s.length;
        const arr = Array.from({ length: t.length + 1 }, (_, i) => [i]);
        for (let j = 1; j <= s.length; j++) arr[0][j] = j;
        for (let i = 1; i <= t.length; i++) {
            for (let j = 1; j <= s.length; j++) {
                const cost = s[j - 1] === t[i - 1] ? 0 : 1;
                arr[i][j] = Math.min(arr[i - 1][j] + 1, arr[i][j - 1] + 1, arr[i - 1][j - 1] + cost);
            }
        }
        return arr[t.length][s.length];
    };

    const isFuzzyMatch = (word: string, keyword: string): boolean => {
        if (word.length < 3) return word === keyword;
        const dist = getLevenshteinDistance(word, keyword);
        const threshold = Math.max(1, Math.floor(keyword.length * 0.25)); // Allow ~25% error
        return dist <= threshold;
    };

    const findBestMatch = (text: string) => {
        if (!analytics) return "I'm still gathering your data. Try again in a second!";
        
        const words = text.toLowerCase().replace(/[?.,!]/g, "").split(/\s+/);
        
        // Define Intents and their Keywords
        const intents = [
            { id: 'STATS', keywords: ["how", "many", "quiz", "total", "solved", "complete", "score", "point", "mark", "quizes"], weight: 0 },
            { id: 'STRENGTHS', keywords: ["strength", "best", "great", "strong", "good", "excell", "master"], weight: 0 },
            { id: 'WEAKNESSES', keywords: ["weak", "bad", "improve", "poor", "difficult", "struggle", "fail"], weight: 0 },
            { id: 'HISTORY', keywords: ["recent", "history", "last", "latest", "past", "yesterday", "today"], weight: 0 }
        ];

        // Score each intent based on fuzzy keyword matches
        intents.forEach(intent => {
            words.forEach(word => {
                intent.keywords.forEach(kw => {
                    if (isFuzzyMatch(word, kw)) {
                        intent.weight += (word === kw ? 2 : 1.5); // Exact match gets more weight
                    }
                });
            });
        });

        // Topic matching scoring
        let bestTopic: any = null;
        let bestTopicWeight = 0;
        const topics = analytics.allTopics || [];
        
        topics.forEach((t: any) => {
            const topicNameLower = t.topic.toLowerCase();
            const topicParts = topicNameLower.split(/\s+/);
            
            words.forEach(word => {
                topicParts.forEach(tp => {
                    if (isFuzzyMatch(word, tp)) {
                        bestTopicWeight += (word === tp ? 5 : 3); // High weight for topic names
                    }
                });
            });
            
            if (bestTopicWeight > 0 && (!bestTopic || bestTopicWeight > bestTopic.weight)) {
                bestTopic = { ...t, weight: bestTopicWeight };
            }
            bestTopicWeight = 0;
        });

        // Logic Dispatcher
        const winner = intents.sort((a, b) => b.weight - a.weight)[0];

        // If a topic is strongly mentioned, prioritize it
        if (bestTopic && bestTopic.weight >= 4) {
            return `In ${bestTopic.topic}, your precision is ${bestTopic.score}% based on ${bestTopic.total} questions.`;
        }

        if (winner.weight < 1.2) {
            return "I'm not sure about that. You can ask me 'How many quizzes did I solve?', 'What are my strengths?', or 'How am I doing in [Topic Name]?'";
        }

        switch (winner.id) {
            case 'STATS':
                return `You have completed ${analytics.stats.totalQuizzes} quizzes so far with a total of ${analytics.stats.totalPoints} points!`;
            case 'STRENGTHS':
                if (analytics.strengths && analytics.strengths.length > 0) {
                    return `Your top strengths are: ${analytics.strengths.map((s: any) => `${s.topic} (${s.score}%)`).join(', ')}. Excellent work!`;
                }
                return "I need a few more quiz results to identify your strengths. Keep practicing!";
            case 'WEAKNESSES':
                if (analytics.weaknesses && analytics.weaknesses.length > 0) {
                    return `You should focus on: ${analytics.weaknesses.map((w: any) => `${w.topic} (${w.score}%)`).join(', ')}. I recommend reviewing these topics.`;
                }
                return "You don't have any major weaknesses identified yet! That's a great sign.";
            case 'HISTORY':
                if (analytics.recentHistory && analytics.recentHistory.length > 0) {
                    const last = analytics.recentHistory[0];
                    return `Your last quiz was on ${new Date(last.date).toLocaleDateString()} and you scored ${last.score}/100.`;
                }
                return "You haven't taken any quizzes yet!";
            default:
                return "I'm still learning! Try asking about your scores or strengths.";
        }
    };
    // --- ALGORITHM END ---

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput("");
        setIsTyping(true);

        setTimeout(() => {
            const botReply = findBestMatch(userMsg);
            setMessages(prev => [...prev, { role: 'bot', content: botReply }]);
            setIsTyping(false);
        }, 600);
    };

    if (!currentUser) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4"
                    >
                        <Card className="w-[320px] sm:w-[380px] h-[450px] flex flex-col overflow-hidden bg-white border-4 border-black shadow-[8px_8px_0_0_#000]">
                            {/* Header */}
                            <div className="bg-[var(--nb-blue)] text-white p-4 border-b-4 border-black flex justify-between items-center">
                                <span className="font-black uppercase tracking-wider">Study Assistant</span>
                                <button onClick={() => setIsOpen(false)} className="text-2xl font-black">×</button>
                            </div>

                            {/* Chat Window */}
                            <div 
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fff9f0] custom-scrollbar"
                            >
                                {messages.map((msg, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`
                                            max-w-[85%] p-3 font-bold text-sm border-2 border-black
                                            ${msg.role === 'user' 
                                                ? 'bg-[var(--nb-yellow)] rounded-l-lg rounded-tr-lg shadow-[2px_2px_0_0_#000]' 
                                                : 'bg-white rounded-r-lg rounded-tl-lg shadow-[2px_2px_0_0_#000]'}
                                        `}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border-2 border-black p-2 rounded-lg animate-pulse text-xs font-black uppercase">Thinking...</div>
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t-4 border-black bg-white flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask anything..."
                                    className="flex-1 px-3 py-2 text-sm border-2 border-black focus:shadow-none focus:translate-x-0.5 focus:translate-y-0.5"
                                />
                                <Button 
                                    onClick={handleSend}
                                    className="bg-[var(--nb-pink)] border-2 border-black shadow-[2px_2px_0_0_#000] p-2"
                                >
                                    GO
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 bg-[var(--nb-green)] border-4 border-black rounded-full flex items-center justify-center text-3xl shadow-[4px_4px_0_0_#000] font-black"
            >
                {isOpen ? '?' : 'AI'}
            </motion.button>
        </div>
    );
};
