import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useAppContext } from "../../context/AppContext";
import { Card, Button, Spinner, useToast } from "../../components/ui";

const POLL_POLL_INTERVAL = 500;
const SESSION_TIMEOUT = 3000;

const PollTaker: React.FC = () => {
    const { pollId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAppContext();
    const { addToast } = useToast();
    const [polls, setPolls] = useState<any[]>([]);
    const [poll, setPoll] = useState<any | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [voting, setVoting] = useState(false);
    const [clientTimer, setClientTimer] = useState<number | null>(null);
    const [connectionError, setConnectionError] = useState(false);
    const intervalRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const all = await api.getPolls();
                if (!mounted) return;
                setPolls(all || []);
                const found = (all || []).find((p: any) => (p._id || p.id) === pollId);
                setPoll(found || null);
                if (found) {
                    try {
                        const assign = await api.getPollAssignment(found._id || found.id);
                        setPoll({ ...found, assignment: assign });
                    } catch (e) { }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [pollId]);

    useEffect(() => {
        if (session && session.timeLeft !== null && session.timeLeft > 0) {
            setClientTimer(session.timeLeft);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = window.setInterval(() => {
                setClientTimer((prev) => {
                    if (prev === null || prev <= 0) return prev;
                    return Math.max(0, prev - 1000);
                });
            }, 1000);
        } else if (session && session.timeLeft === 0) {
            setClientTimer(0);
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [session?.timeLeft, session?.active]);

    useEffect(() => {
        const tick = async () => {
            if (!poll) return;
            try {
                const s = await api.getPollSession(poll._id || poll.id);
                setSession(s);
                setConnectionError(false);
                if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
                sessionTimeoutRef.current = setTimeout(() => {
                    if (!connectionError) setConnectionError(true);
                }, SESSION_TIMEOUT);
                if (s && s.voters && (s.voters as any[]).length > 0) {
                    if (currentUser) {
                        const uid = currentUser._id || currentUser.id;
                        if (s.voters && s.voters.includes(uid)) setHasVoted(true);
                    }
                }
            } catch (e) {
                console.error(e);
                setConnectionError(true);
            }
        };
        tick();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(tick, POLL_POLL_INTERVAL);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
        };
    }, [poll, currentUser, connectionError]);

    useEffect(() => {
        if (!session) return;
        if (session.timeLeft === 0) {
            const t = setTimeout(() => { advanceToNextPoll(); }, 4000);
            return () => clearTimeout(t);
        }
    }, [session]);

    const totalVotes = useMemo(() => {
        if (!session || !session.votes) return 0;
        return session.votes.reduce((s: number, v: number) => s + (v || 0), 0);
    }, [session]);

    const handleVote = async (index: number) => {
        if (!poll || hasVoted || voting) return;
        if (poll.assignment && currentUser) {
            const uid = currentUser._id || currentUser.id;
            const assigned = (poll.assignment.studentIds || []).map((s: any) => (s._id || s.id || s)).map(String);
            if (!assigned.includes(String(uid))) {
                addToast('You are not assigned to this poll', 'error');
                return;
            }
        }
        setSelected(index);
        setVoting(true);
        try {
            await api.votePoll(poll._id || poll.id, index, currentUser ? (currentUser._id || currentUser.id) : undefined);
            setHasVoted(true);
            addToast('✓ Vote recorded!', 'success');
        } catch (e: any) {
            addToast(e?.response?.data?.message || 'Failed to record vote', 'error');
            setSelected(null);
        } finally {
            setVoting(false);
        }
    };

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (hasVoted || voting || !session || (clientTimer === 0 || session.active === false)) return;
            const qIndex = session?.currentQuestionIndex ?? 0;
            const question = (poll?.questions || [])[qIndex];
            const optCount = (question?.options || []).length;
            if (e.key === 'ArrowUp') { e.preventDefault(); if (selected === null) setSelected(optCount - 1); else if (selected > 0) setSelected(selected - 1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); if (selected === null) setSelected(0); else if (selected < optCount - 1) setSelected(selected + 1); }
            else if (e.key === 'Enter' && selected !== null) { e.preventDefault(); handleVote(selected); }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selected, session, voting, hasVoted, poll, clientTimer]);

    const handleRefreshSession = async () => {
        try {
            setConnectionError(false);
            const s = await api.getPollSession(poll._id || poll.id);
            setSession(s);
            addToast('✓ Reconnected', 'success');
        } catch (e) {
            addToast('Failed to reconnect', 'error');
        }
    };

    const advanceToNextPoll = () => {
        if (!polls || polls.length === 0 || !poll) { navigate("/student"); return; }
        const idx = polls.findIndex((p) => (p._id || p.id) === (poll._id || poll.id));
        if (idx < 0 || idx + 1 >= polls.length) navigate("/student");
        else { const next = polls[idx + 1]; navigate(`/poll/${next._id || next.id}`); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

    if (!poll) return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-2xl text-center border-4 border-black shadow-[var(--shadow-md)] bg-white p-8">
                <h2 className="text-3xl font-black uppercase text-black mb-4">No poll found</h2>
                <p className="text-lg font-bold text-black opacity-80">This poll may not exist or hasn't been created yet.</p>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen flex items-start justify-center p-6 pb-12">
            <Card className="w-full max-w-4xl border-4 border-black shadow-[var(--shadow-md)] bg-white p-6 sm:p-8">
                {/* Connection Error Banner */}
                {connectionError && (
                    <div className="mb-6 p-4 border-4 border-black bg-red-100 flex items-center justify-between animate-pulse">
                        <span className="flex items-center gap-2 font-black uppercase text-red-600">⚠️ Connection lost. Some updates may be delayed.</span>
                        <button onClick={handleRefreshSession} className="text-sm px-4 py-2 border-2 border-black bg-red-500 text-white font-black uppercase hover:bg-red-400 transition-colors shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                            Reconnect
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-4xl font-black uppercase text-black mb-4">{poll.title || `Poll`}</h2>
                    <div className="flex items-center justify-between mb-6">
                        <div className="text-base font-bold uppercase text-black">
                            Question <span className="font-black bg-[var(--nb-yellow)] border-2 border-black px-2 mx-1">{(session?.currentQuestionIndex ?? 0) + 1}</span> of <span className="font-black">{(poll.questions || []).length}</span>
                        </div>
                        <div className="flex-1 mx-6 h-4 border-4 border-black bg-white overflow-hidden shadow-inner relative">
                            <div
                                style={{ width: `${((session?.currentQuestionIndex ?? 0) + 1) / (poll.questions || []).length * 100}%` }}
                                className="h-full bg-[var(--nb-pink)] border-r-4 border-black transition-all duration-300 relative top-[-4px] bottom-[-4px] mb-[-8px] pb-8"
                            />
                        </div>
                    </div>

                    {session && session.timeLeft !== null && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className={`px-6 py-3 border-4 border-black font-black text-2xl uppercase ${
                                (clientTimer || 0) < 5000 && (clientTimer || 0) > 0 ? 'bg-red-500 text-white animate-pulse' : 
                                (clientTimer || 0) === 0 ? 'bg-gray-300 text-black' : 'bg-[var(--nb-blue)] text-white'
                            }`}>
                                ⏱ {Math.ceil((clientTimer || 0) / 1000)}s
                            </div>
                            {clientTimer === 0 && <span className="text-lg font-black uppercase text-[var(--nb-pink)] animate-bounce border-2 border-black bg-white px-3 py-1 mt-2 sm:mt-0">📊 Results Shown</span>}
                        </div>
                    )}
                </div>

                {/* Question Text */}
                {(() => {
                    const qIndex = session?.currentQuestionIndex ?? 0;
                    const question = (poll.questions || [])[qIndex];
                    return question && question.questionText ? (
                        <div className="mb-8 p-6 border-4 border-black bg-[var(--nb-yellow)] shadow-[var(--shadow-sm)]">
                            <p className="text-2xl font-black uppercase text-black leading-snug">{question.questionText}</p>
                        </div>
                    ) : null;
                })()}

                {/* Options */}
                <div className="space-y-4 mb-8">
                    {(() => {
                        const qIndex = session?.currentQuestionIndex ?? 0;
                        const question = (poll.questions || [])[qIndex] || { questionText: '', options: [] };
                        const isSessionExpired = session && (clientTimer === 0 || session.active === false);
                        return (question.options || []).map((opt: string, i: number) => {
                            const votes = session?.votes?.[i] || 0;
                            const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                            const isSelected = selected === i;
                            return (
                                <div key={i}>
                                    <button
                                        onClick={() => handleVote(i)}
                                        disabled={hasVoted || isSessionExpired || voting}
                                        className={`w-full text-left p-4 sm:p-6 border-4 border-black transition-all flex justify-between items-center ${
                                            isSelected && !isSessionExpired ? 'bg-[var(--nb-pink)] translate-x-1 translate-y-1' :
                                            isSessionExpired ? 'bg-gray-100 opacity-80 cursor-default' :
                                            'bg-white shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-gray-50'
                                        } focus:outline-none`}
                                    >
                                        <div className="flex-1">
                                            <span className="block text-xl font-bold text-black">{opt}</span>
                                            {isSelected && !isSessionExpired && !hasVoted && !voting && (
                                                <span className="text-sm font-black uppercase mt-2 bg-green-200 text-green-900 px-2 py-1 border-2 border-black inline-block">✓ Selected (Press Enter to submit)</span>
                                            )}
                                            {voting && isSelected && (
                                                <span className="text-sm font-black uppercase mt-2 bg-blue-200 text-blue-900 px-2 py-1 border-2 border-black inline-flex items-center gap-2">
                                                    <span className="inline-block animate-spin">⏳</span> Submitting...
                                                </span>
                                            )}
                                            {isSelected && hasVoted && (
                                                <span className="text-sm font-black uppercase mt-2 bg-green-200 text-green-900 px-2 py-1 border-2 border-black inline-block">✓ Your vote</span>
                                            )}
                                        </div>
                                        <span className="text-2xl font-black text-black ml-4 bg-white border-4 border-black w-12 h-12 flex items-center justify-center rounded-full shrink-0">{votes}</span>
                                    </button>

                                    {isSessionExpired && (
                                        <div className="mt-3 flex items-center gap-4">
                                            <div className="flex-1 h-8 border-4 border-black bg-white overflow-hidden relative shadow-inner">
                                                <div style={{ width: `${percent}%` }} className="h-full bg-[var(--nb-blue)] border-r-4 border-black transition-all duration-700 flex items-center justify-end pr-2 relative top-[-4px] bottom-[-4px] mb-[-8px] pb-8">
                                                    {percent > 10 && <span className="text-sm font-black text-white relative z-10">{percent}%</span>}
                                                </div>
                                            </div>
                                            <span className="text-lg font-black w-14 text-right text-black">{percent}%</span>
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 p-6 border-4 border-black bg-white shadow-[var(--shadow-sm)] mb-8 transition-all hover:bg-gray-50">
                    <div className="text-center border-r-4 border-black pr-4">
                        <p className="text-xs font-black uppercase text-black opacity-60 mb-1">Total Votes</p>
                        <p className="text-3xl font-black text-black">{totalVotes}</p>
                    </div>
                    {hasVoted ? (
                        <div className="text-center border-r-4 border-black px-4 flex flex-col items-center justify-center">
                            <p className="text-xs font-black uppercase text-black opacity-60 mb-1">Status</p>
                            <p className="text-xl font-black text-green-600 bg-green-100 px-3 py-1 border-2 border-black inline-block uppercase">✓ Voted</p>
                        </div>
                    ) : (
                        <div className="text-center border-r-4 border-black px-4 flex flex-col items-center justify-center">
                            <p className="text-xs font-black uppercase text-black opacity-60 mb-1">Your Vote</p>
                            <p className="text-xl font-black text-yellow-600 bg-yellow-100 px-3 py-1 border-2 border-black inline-block uppercase">Pending</p>
                        </div>
                    )}
                    <div className="text-center pl-4">
                        <p className="text-xs font-black uppercase text-black opacity-60 mb-1">Participants</p>
                        <p className="text-3xl font-black text-black">{session?.voters?.length || 0}</p>
                    </div>
                </div>

                {/* Keyboard Hint */}
                {!hasVoted && clientTimer !== 0 && (
                    <div className="text-sm text-center mb-6 p-4 border-4 border-black bg-[var(--nb-yellow)] font-bold text-black uppercase">
                        💡 Tip: Use ↑↓ arrow keys to navigate options, press Enter to submit
                    </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex gap-4 justify-end">
                    <Button variant="secondary" onClick={() => navigate('/student')} className="border-4 border-black px-8 py-4 text-lg font-black uppercase shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none bg-white">
                        Exit Poll
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default PollTaker;
