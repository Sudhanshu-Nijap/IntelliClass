import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { StatCard } from "../../features/dashboard/StatCard";
import { ContributionHeatmap } from "../../features/dashboard/ContributionHeatmap";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import { Button, Card, Modal } from "../../components/ui";
import Calendar from "../../components/shared/Calendar";
import {
  CalendarIcon,
  TrophyIcon,
  RankingIcon,
  ChartPieIcon,
} from "../../components/Icons";
import { api, BASE } from "../../services/api";
import io from "socket.io-client";
import { useToast } from "../../components/ui";

const StudentDashboard = () => {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [studentAssignments, setStudentAssignments] = React.useState<any[]>([]);
  const [assignedPolls, setAssignedPolls] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [quizzes, setQuizzes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = React.useState(false);

  // Get the correct user ID (handle both _id and id)
  const currentUserId = currentUser?._id || currentUser?.id;

  const studentResults = React.useMemo(() => {
    return results.filter((r) => String(r.userId) === String(currentUserId));
  }, [results, currentUserId]);

  const avgScore = React.useMemo(() => {
    return studentResults.length > 0
      ? Math.round(
        studentResults.reduce((acc, r) => acc + r.score, 0) /
        studentResults.length
      )
      : "N/A";
  }, [studentResults]);

  const overallRank = React.useMemo(() => {
    if (!currentUserId || users.length === 0) return "N/A";
    return (
      users
        .filter((u) => u.role === "STUDENT")
        .sort((a, b) => b.points - a.points)
        .findIndex((u) => (u._id || u.id) === currentUserId) + 1
    );
  }, [users, currentUserId]);



  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [usersRes, assignmentsRes, quizzesRes, resultsRes] =
          await Promise.all([
            api.getUsers(),
            api.getAssignments(),
            api.getQuizzes(),
            api.getResults(),
          ]);

        setUsers(usersRes || []);
        setQuizzes(quizzesRes || []);
        setResults(resultsRes || []);
        try {
          const pollsAssigned = await api.getAssignedPolls();
          setAssignedPolls(pollsAssigned || []);
        } catch (e) {
          // ignore
        }

        const studentAssignmentsData = (assignmentsRes || []).filter((a: any) =>
          (a.studentIds || []).some((id: any) => String(id) === String(currentUserId))
        );

        setStudentAssignments(studentAssignmentsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUserId) {
      fetchData();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const socket = io(`${BASE}/assignments`);

    socket.on("connect", () => {
      console.log("Connected to assignments websocket");
    });

    socket.on("newAssignment", async (newAssignment) => {
      if ((newAssignment.studentIds || []).some((id: any) => String(id) === String(currentUserId))) {
        setStudentAssignments((prev) => {
          const assignmentExists = prev.some(
            (assignment) => assignment._id === newAssignment._id
          );
          if (!assignmentExists) {
            addToast("A new quiz has been assigned to you!", "info");
            return [...prev, newAssignment];
          }
          return prev;
        });
        const quizzesRes = await api.getQuizzes();
        setQuizzes(quizzesRes || []);
      }
    });

    socket.on("deassignQuiz", ({ quizId, studentIds }) => {
      if ((studentIds || []).some((id: any) => String(id) === String(currentUserId))) {
        addToast("A quiz has been unassigned.", "info");
        setStudentAssignments((prev) =>
          prev.filter((assignment) => assignment.quizId !== quizId)
        );
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from assignments websocket");
    });

    socket.on("connect_error", (err) => {
      console.error("Assignments websocket connection error:", err);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId, addToast]);

  const calendarEvents = React.useMemo(() => {
    return studentAssignments.map(assignment => {
      const quiz = quizzes.find(q => String(q._id) === String(assignment.quizId));
      return {
        date: new Date(assignment.deadline),
        title: quiz ? `Quiz: ${quiz.title}` : 'Quiz Deadline',
        type: 'quiz' as const,
        onClick: () => {
          if (quiz) {
            const isTaken = studentResults.some(r => String(r.quizId) === String(quiz._id));
            if (isTaken) {
              navigate(`/results/${quiz._id}`);
            } else {
              navigate(`/quiz/${assignment._id}`);
            }
          }
        }
      };
    });
  }, [studentAssignments, quizzes, studentResults, navigate]);

  return (
    <AnimatedWrapper className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-black leading-tight">
            Welcome back, {currentUser?.name}!
          </h2>
          <p className="text-base sm:text-lg font-bold mt-2" style={{ color: 'var(--text-muted)' }}>READY TO CONQUER SOME QUIZZES TODAY?</p>
        </div>
        <Button
          onClick={() => setIsCalendarModalOpen(true)}
          variant="secondary"
          className="w-full sm:w-auto self-start sm:self-center"
        >
          <CalendarIcon className="w-5 h-5 mr-2" />
          View Calendar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col gap-6">

          <Card>
            <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2">Assigned Quizzes</h3>
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg" style={{ color: 'var(--error)', background: 'rgba(239,68,68,0.1)' }}>
                {error}
              </div>
            ) : studentAssignments.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <StaggeredList className="space-y-3">
                  {studentAssignments.map((assignment) => {
                    const quiz = quizzes.find((q) => String(q._id) === String(assignment.quizId));
                    const isTaken = studentResults.some(
                      (r) => String(r.quizId) === String(quiz?._id)
                    );
                    const isExpired = new Date(assignment.deadline) < new Date();
                    if (!quiz) return null;
                    return (
                      <div
                        key={assignment._id || assignment.id}
                        className="p-4 sm:p-5 flex flex-col xs:flex-row justify-between items-start xs:items-center gap-4 transition-all duration-150 ease-out hover:scale-[1.01] hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-black shadow-[var(--shadow-sm)] bg-white"
                      >
                        <div>
                          <p className="font-black text-lg sm:text-2xl uppercase text-black">
                            {quiz.title}{" "}
                            {assignment.isLive && (
                              <span className="text-xs sm:text-sm font-black text-white bg-red-600 px-3 py-1 ml-2 border-2 border-black inline-block transform -rotate-2">
                                LIVE
                              </span>
                            )}
                          </p>
                          <p className="text-sm sm:text-base font-bold flex items-center gap-2 mt-2" style={{ color: 'var(--text-muted)' }}>
                            <CalendarIcon className="w-4 h-4" /> DEADLINE:{" "}
                            {new Date(assignment.deadline).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="w-full xs:w-auto flex justify-end">
                          {isTaken ? (
                            <Button
                              onClick={() => navigate(`/results/${quiz._id}`)}
                              variant="secondary"
                              className="w-full xs:w-auto"
                            >
                              Review
                            </Button>
                          ) : isExpired ? (
                            <span className="px-3 py-1 text-[10px] sm:text-xs font-semibold text-red-200 bg-red-800 rounded-full">
                              Expired
                            </span>
                          ) : (
                            <Button
                              onClick={() => {
                                navigate(`/quiz/${assignment._id}`);
                              }}
                              className="w-full xs:w-auto"
                            >
                              {assignment.isLive ? "Join Live Quiz" : "Start Quiz"}
                            </Button>
                          )}
                        </div>
                      </div>

                    );
                  })}
                </StaggeredList>
              </div>
            ) : (
              <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No quizzes assigned yet. Check back later!
              </p>
            )}
          </Card>
          <Card>
            <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2">Assigned Polls</h3>
            {assignedPolls.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                  {assignedPolls.map((p) => (
                    <div key={p._id || p.id} className="p-4 sm:p-5 flex flex-col xs:flex-row justify-between items-start xs:items-center gap-4 bg-[var(--nb-pink)] border-4 border-black shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150">
                      <div>
                        <div className="font-black text-xl sm:text-2xl uppercase text-black">{p.title || `Poll`}</div>
                        <div className="text-sm sm:text-base font-bold text-black opacity-80 mt-1">{(p.questions || []).map((q: any) => q.questionText).slice(0, 2).join(' • ')}{(p.questions || []).length > 2 ? ' ...' : ''}</div>
                      </div>
                      <div className="w-full xs:w-auto flex justify-end">
                        <Button onClick={() => navigate(`/poll/${p._id || p.id}`)} className="w-full xs:w-auto">Open Poll</Button>
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No polls assigned.</p>
            )}
          </Card>
          <Card>
            <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2">Your Activity</h3>
            <ContributionHeatmap results={studentResults} />
          </Card>

          {/* Calendar Modal */}
          <Modal
            isOpen={isCalendarModalOpen}
            onClose={() => setIsCalendarModalOpen(false)}
            title="Quiz Deadlines"
          >
            <div className="p-0 overflow-hidden">
              <Calendar events={calendarEvents} compact={true} />
            </div>
          </Modal>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="flex-1">
            <h3 className="text-2xl font-black mb-6 text-center text-black uppercase border-b-4 border-black pb-2">
              Your Stats
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 sm:gap-6">
              <StatCard
                label="Total Points"
                value={currentUser!.points}
                icon={<TrophyIcon />}
              />
              <StatCard
                label="Overall Rank"
                value={`#${overallRank}`}
                icon={<RankingIcon />}
              />
              <StatCard
                label="Average Score"
                value={avgScore === "N/A" ? "N/A" : `${avgScore}%`}
                icon={<ChartPieIcon />}
              />
            </div>
          </Card>


        </div>
      </div>
    </AnimatedWrapper>
  );
};

export default StudentDashboard;
