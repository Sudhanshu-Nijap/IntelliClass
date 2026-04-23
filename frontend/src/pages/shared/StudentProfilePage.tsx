import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { ContributionHeatmap } from "../../features/dashboard/ContributionHeatmap";
import { Card } from "../../components/ui";
import { api } from "../../services/api";

const StudentProfilePage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  useAppContext();

  const [student, setStudent] = useState<any>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [studentPosts, setStudentPosts] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  const [grade, setGrade] = useState(0);
  const [strengths, setStrengths] = useState<any[]>([]);
  const [weaknesses, setWeaknesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch student data
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        // Some backends may not expose /users/:id; fetch all and find client-side
        const users = await api.getUsers();
        const found = (users || []).find(
          (u: any) => (u._id || u.id) === studentId
        );
        setStudent(found || null);
      } catch (error) {
        console.error("Failed to fetch student:", error);
      }
    };

    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  // Fetch student results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const results = await api.getResults();
        const userResults = (results || []).filter(
          (r: any) => String(r.userId) === String(studentId)
        );
        const sortedResults = userResults.sort(
          (a: any) =>
            new Date(a.submittedAt).getTime()
        );
        setStudentResults(sortedResults);
      } catch (error) {
        console.error("Failed to fetch results:", error);
        setStudentResults([]);
      }
    };

    if (studentId) {
      fetchResults();
    }
  }, [studentId]);

  // Fetch student discussion posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const posts = await api.getPosts();
        const userPosts = (posts || []).filter(
          (p: any) => p.authorId === studentId
        );
        const sortedPosts = userPosts
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5); // Get last 5 posts
        setStudentPosts(sortedPosts);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        setStudentPosts([]);
      }
    };

    if (studentId) {
      fetchPosts();
    }
  }, [studentId]);

  // Fetch quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await api.getQuizzes();
        setQuizzes(response || []);
      } catch (error) {
        console.error("Failed to fetch quizzes:", error);
      }
    };

    fetchQuizzes();
  }, []);

  // Calculate grade and fetch analytics
  useEffect(() => {
    if (!studentId) return;

    const fetchAnalytics = async () => {
      try {
        const data = await api.getUserAnalytics(studentId);
        setGrade(data.grade || 0);
        setStrengths(data.strengths || []);
        setWeaknesses(data.weaknesses || []);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="flex justify-center flex-col gap-4 items-center h-64">
        <div className="text-2xl font-black uppercase text-black animate-pulse">Loading ProfilE...</div>
        <div className="w-16 h-16 border-8 border-[var(--nb-pink)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!student) {
    return <div>Student not found.</div>;
  }

  const gradeColor =
    grade > 80
      ? "bg-green-300 text-black border-4 border-black px-3"
      : grade > 60
        ? "bg-yellow-300 text-black border-4 border-black px-3"
        : "bg-red-400 text-black border-4 border-black px-3";

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-8 pb-12">
      <Card className="p-8 sm:p-12 border-4 border-black shadow-[var(--shadow-md)] bg-[var(--nb-yellow)]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-black">{student.name}</h2>
            <div className="text-lg sm:text-2xl font-black uppercase mt-4 sm:mt-6 p-3 sm:p-4 border-4 border-black bg-white inline-block shadow-[4px_4px_0_0_#000]">
              Overall Grade: <span className={`ml-2 inline-block py-1 ${gradeColor}`}>{grade}/100</span>
            </div>
          </div>
          <div className="w-24 h-24 sm:w-32 sm:h-32 border-8 border-black rounded-full bg-white flex items-center justify-center text-4xl sm:text-6xl font-black uppercase text-black shadow-[8px_8px_0_0_#000]">
              {student.name.charAt(0)}
          </div>
        </div>
      </Card>

      {/* Strengths & Weaknesses Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <Card className="border-4 border-black p-6 sm:p-8 bg-white shadow-[var(--shadow-sm)]">
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-black mb-4 sm:mb-6 border-b-4 border-black pb-4 flex items-center gap-2">
            <span className="text-green-500">✔</span> Strengths
          </h3>
          <div className="flex flex-wrap gap-3">
            {strengths.length > 0 ? (
              strengths.map((s) => (
                <span key={s.topic} className="px-3 py-1 bg-green-200 border-2 border-black font-black uppercase text-sm shadow-[2px_2px_0_0_#000] flex items-center gap-2">
                  {s.topic} <span className="text-[10px] bg-white border border-black px-1">{s.score}%</span>
                </span>
              ))
            ) : (
              <p className="text-black opacity-50 font-bold uppercase italic">Analyzing patterns...</p>
            )}
          </div>
        </Card>

        <Card className="border-4 border-black p-6 sm:p-8 bg-white shadow-[var(--shadow-sm)]">
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-black mb-4 sm:mb-6 border-b-4 border-black pb-4 flex items-center gap-2">
            <span className="text-red-500">✘</span> Weaknesses
          </h3>
          <div className="flex flex-wrap gap-3">
            {weaknesses.length > 0 ? (
              weaknesses.map((w) => (
                <span key={w.topic} className="px-3 py-1 bg-red-200 border-2 border-black font-black uppercase text-sm shadow-[2px_2px_0_0_#000] flex items-center gap-2">
                  {w.topic} <span className="text-[10px] bg-white border border-black px-1">{w.score}%</span>
                </span>
              ))
            ) : (
              <p className="text-black opacity-50 font-bold uppercase italic">Keep practicing!</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="border-4 border-black p-6 sm:p-8 bg-white shadow-[var(--shadow-sm)]">
        <h3 className="text-2xl sm:text-3xl font-black uppercase text-black mb-6 border-b-4 border-black pb-4">Activity Heatmap</h3>
        <ContributionHeatmap results={studentResults} />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-4 border-black p-8 bg-white shadow-[var(--shadow-sm)]">
          <h3 className="text-3xl font-black uppercase text-black mb-6 border-b-4 border-black pb-4">Quiz History</h3>
          {studentResults.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar space-y-6 flex flex-col pt-2">
              {studentResults.map((result) => {
                const quiz = quizzes.find(
                  (q) => q._id === result.quizId || q.id === result.quizId
                );
                return (
                  <div
                    key={result.submittedAt}
                    className="p-4 border-4 border-black bg-[var(--nb-pink)] shadow-[4px_4px_0_0_#000] flex justify-between items-center group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                    <div>
                      <p className="font-black text-xl text-black uppercase mb-1">
                        {quiz?.title || "Unknown Quiz"}
                      </p>
                      <p className="text-sm font-bold text-black opacity-80 uppercase px-2 py-1 bg-white border-2 border-black inline-block">
                        Taken: {" "}
                        {new Date(result.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-black text-2xl text-black bg-white px-3 py-2 border-4 border-black">{result.score}/100</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xl font-black uppercase text-black opacity-60 text-center py-8">No quizzes taken yet.</p>
          )}
        </Card>
        <Card className="border-4 border-black p-8 bg-white shadow-[var(--shadow-sm)]">
          <h3 className="text-3xl font-black uppercase text-black mb-6 border-b-4 border-black pb-4">
            Recent Discussions
          </h3>
          {studentPosts.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar space-y-6 flex flex-col pt-2">
              {studentPosts.map((post) => (
                <Link
                  to={`/discussions/${post._id || post.id}`}
                  key={post._id || post.id}
                  className="block p-4 border-4 border-black bg-[var(--nb-blue)] text-white shadow-[4px_4px_0_0_#000] group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  <p className="font-black text-xl uppercase mb-2 truncate">{post.title}</p>
                  <p className="text-sm font-bold opacity-80 uppercase px-2 py-1 bg-black text-white border-2 border-white inline-block">
                    Posted: {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xl font-black uppercase text-black opacity-60 text-center py-8">No discussion posts yet.</p>
          )}
        </Card>
      </div>
    </AnimatedWrapper>
  );
};

export default StudentProfilePage;
