import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import { Card, Tabs, useToast } from "../../components/ui";
import { TrophyIcon } from "../../components/Icons";
import io from "socket.io-client";
import { BASE } from "../../services/api";

const LeaderboardPage = () => {
  const { addToast } = useToast();
  const { quizId } = useParams<{ quizId?: string }>();
  const { users, quizzes, results } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(quizId ? "By Quiz" : "Overall");
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(
    quizId || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallLeaderboard, setOverallLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const socket = io(`${BASE}/leaderboard`, {
      transports: ["polling", "websocket"]
    });

    socket.on("connect", () => {
      setLoading(false);
    });

    socket.on("initialData", (data) => {
      setOverallLeaderboard(data);
    });

    socket.on("update", (data) => {
      addToast("Leaderboard has been updated!", "info");
      setOverallLeaderboard(data);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from leaderboard websocket");
    });

    socket.on("connect_error", (err) => {
      console.error("Leaderboard websocket connection error:", err);
      setError("Failed to connect to real-time leaderboard updates.");
      setLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [addToast]);

  const rankBadges = ["🥇", "🥈", "🥉"];

  // Calculate quiz statistics
  const quizStats = useMemo(() => {
    if (!selectedQuizId || !results.length) return null;

    const quizResults = results.filter((r) => r.quizId === selectedQuizId);
    if (!quizResults.length) return null;

    const scores = quizResults.map((r) => r.score);
    return {
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      totalAttempts: quizResults.length,
    };
  }, [results, selectedQuizId]);

  const quizLeaderboard = useMemo(() => {
    if (!selectedQuizId) return [];
    const studentUsers = (users || []).filter((u) => u.role === "STUDENT");
    return results
      .filter((r) => r.quizId === selectedQuizId)
      .sort((a, b) => {
        // First sort by score
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        // Then by time taken (faster completion is better)
        return (a.timeTaken || 0) - (b.timeTaken || 0);
      })
      .map((result) => {
        const user = studentUsers.find(
          (u) => (u._id || (u as any).id) === result.userId
        );
        return {
          user,
          result,
          rank: 0, // Will be set based on position
        };
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [results, users, selectedQuizId]);
  const selectedQuiz = quizzes.find((q) => q._id === selectedQuizId);

  const handleQuizSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuizId = e.target.value;
    setSelectedQuizId(newQuizId);
    setActiveTab("By Quiz");
    navigate(newQuizId ? `/leaderboard/${newQuizId}` : "/leaderboard");
  };

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-8 pb-12">
      <h2 className="text-4xl font-black uppercase text-black mb-8 border-b-4 border-black pb-4">Leaderboards</h2>
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card>
          <Tabs
            tabs={["Overall", "By Quiz"]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <div className="mt-6">
            {activeTab === "Overall" && (
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Overall Student Rankings (by Points)
                </h3>
                <StaggeredList className="space-y-2">
                  {overallLeaderboard.map((student, index) => (
                    <div
                      key={student._id}
                      className="flex justify-between items-center p-4 border-4 border-black bg-white shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                      <span className="font-medium text-lg flex items-center gap-3">
                        <span
                          className={`text-2xl w-8 h-8 flex items-center justify-center font-black ${index < 3 ? 'bg-[var(--nb-yellow)] border-2 border-black' : 'opacity-50'}`}
                        >
                          {rankBadges[index] || index + 1}
                        </span>
                        <button
                          className="text-xl font-bold uppercase text-black hover:underline"
                          onClick={() => {
                            if (student._id) {
                              addToast(
                                `Viewing ${student.name}'s profile`,
                                "info"
                              );
                              navigate(`/student/${student._id}`);
                            }
                          }}
                        >
                          {student.name}
                        </button>
                      </span>
                      <span className="font-black text-black bg-[var(--nb-pink)] px-4 py-2 border-2 border-black flex items-center gap-2">
                        <TrophyIcon className="w-6 h-6" />
                        {student.points} PTS
                      </span>
                    </div>
                  ))}
                </StaggeredList>
              </div>
            )}
            {activeTab === "By Quiz" && (
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Quiz-Specific Rankings
                </h3>
                <select
                  onChange={handleQuizSelection}
                  value={selectedQuizId || ""}
                  className="w-full p-4 mb-8 border-4 border-black font-bold uppercase text-lg focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white"
                >
                  <option value="">-- Select a Quiz --</option>
                  {quizzes
                    .filter((q) => !q.isPractice)
                    .map((q) => (
                      <option key={q._id} value={q._id}>
                        {q.title}
                      </option>
                    ))}
                </select>

                {selectedQuizId && (
                  <>
                    <div className="mb-6">
                      <h4 className="text-lg font-bold mb-2">
                        Results for: {selectedQuiz?.title}
                      </h4>
                      {quizStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                          <div className="p-4 border-4 border-black bg-[var(--nb-pink)] shadow-[var(--shadow-sm)] flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-black uppercase text-black opacity-80 mb-1">
                              Average Score
                            </p>
                            <p className="text-2xl font-black text-black">
                              {quizStats.avgScore.toFixed(1)}%
                            </p>
                          </div>
                          <div className="p-4 border-4 border-black bg-[var(--nb-blue)] shadow-[var(--shadow-sm)] flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-black uppercase text-white opacity-80 mb-1">
                              Highest Score
                            </p>
                            <p className="text-2xl font-black text-white">
                              {quizStats.maxScore}%
                            </p>
                          </div>
                          <div className="p-4 border-4 border-black bg-[var(--nb-yellow)] shadow-[var(--shadow-sm)] flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-black uppercase text-black opacity-80 mb-1">
                              Lowest Score
                            </p>
                            <p className="text-2xl font-black text-black">
                              {quizStats.minScore}%
                            </p>
                          </div>
                          <div className="p-4 border-4 border-black bg-white shadow-[var(--shadow-sm)] flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-black uppercase text-black opacity-80 mb-1">
                              Total Attempts
                            </p>
                            <p className="text-2xl font-black text-black">
                              {quizStats.totalAttempts}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {quizLeaderboard.length > 0 ? (
                      <StaggeredList className="space-y-2">
                        {quizLeaderboard.map(({ user, result, rank }) => (
                          <div
                            key={user?._id}
                            className={`flex justify-between items-center p-4 border-4 border-black shadow-[var(--shadow-sm)] transition-all ${rank <= 3 ? 'bg-[var(--nb-yellow)]' : 'bg-white'}`}
                          >
                            <span className="font-medium flex items-center gap-4">
                              <span
                                className={`text-xl w-10 h-10 flex items-center justify-center border-4 border-black font-black bg-white`}
                              >
                                {rank <= 3 ? rankBadges[rank - 1] : rank}
                              </span>
                              <button
                                className="text-xl font-bold uppercase text-black hover:underline"
                                onClick={() =>
                                  user?._id && navigate(`/student/${user._id}`)
                                }
                              >
                                {user?.name || "Unknown Student"}
                              </button>
                            </span>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-end">
                                <span className="font-black text-black text-2xl">
                                  {result.score}%
                                </span>
                                <span className="text-sm font-bold opacity-80 text-black">
                                  {Math.floor(result.timeTaken / 60)}m{" "}
                                  {result.timeTaken % 60}s
                                </span>
                              </div>
                              <TrophyIcon
                                className={`w-5 h-5 ${rank === 1
                                  ? "text-yellow-400"
                                  : rank === 2
                                    ? "text-slate-300"
                                    : rank === 3
                                      ? "text-amber-600"
                                      : "hidden"
                                  }`}
                              />
                            </div>
                          </div>
                        ))}
                      </StaggeredList>
                    ) : (
                      <div className="text-center py-8">
                        <p className="mb-2" style={{ color: 'var(--text-muted)' }}>
                          No results yet for this quiz
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
                          Students haven't attempted this quiz yet
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </AnimatedWrapper>
  );
};

export default LeaderboardPage;
