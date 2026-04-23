import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { Button, Card, Spinner } from "../../components/ui";
import {
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
} from "../../components/Icons";
import { api } from "../../services/api";

const QuizResults = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { currentUser } = useAppContext();
  const navigate = useNavigate();

  const [result, setResult] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch quiz and result data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch quizzes and results in parallel via shared API
        const [quizzesRes, resultsRes] = await Promise.all([
          api.getQuizzes(),
          api.getResults(),
        ]);

        const quizData = (quizzesRes || []).find((q: any) => q._id === quizId);
        let resultData = (resultsRes || []).find(
          (r: any) => r.quizId === quizId && r.userId === currentUser?._id
        );

        // Normalize result shape (timeTaken seconds, numeric)
        if (resultData) {
          const raw = resultData.timeTaken as any;
          let timeTakenNum = typeof raw === "string" ? parseInt(raw, 10) : raw;
          if (Number.isFinite(timeTakenNum) && timeTakenNum > 300000) {
            // looks like ms → convert to seconds
            timeTakenNum = Math.round(timeTakenNum / 1000);
          }
          if (!Number.isFinite(timeTakenNum)) timeTakenNum = 0;
          resultData = { ...resultData, timeTaken: timeTakenNum };
        }

        if (!quizData) {
          setError("Quiz not found");
          return;
        }

        if (!resultData) {
          setError("Result not found");
          return;
        }

        setQuiz(quizData);
        setResult(resultData);
      } catch (err) {
        console.error("Failed to fetch results data:", err);
        setError("Failed to load results. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId && currentUser?._id) {
      fetchData();
    }
  }, [quizId, currentUser?._id]);


  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="max-w-2xl mx-auto border-4 border-black shadow-[var(--shadow-md)] bg-white">
        <div className="text-center space-y-4">
          <p className="font-black text-xl text-red-500 uppercase">{error}</p>
          <Button onClick={() => navigate("/student")} className="px-8 py-4 text-lg">
            Back to Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  if (!result || !quiz) return <div>Result not found.</div>;

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-8 pb-12">
      <Card className="border-4 border-black shadow-[var(--shadow-md)] bg-white p-6 sm:p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--nb-yellow)] rounded-full -mr-16 -mt-16 border-4 border-black shadow-[var(--shadow-sm)]" />
        <h2 className="text-4xl font-black uppercase text-black mb-6 relative z-10">Results for {quiz.title}</h2>
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center text-lg relative z-10">
          <div className="px-6 py-4 bg-[var(--nb-pink)] border-4 border-black shadow-[var(--shadow-sm)]">
            <strong>Score:</strong>{" "}
            <span className="text-black font-black text-xl">
              {result.answers.filter((a: any) => a.isCorrect).length}/
              {result.answers.length}
            </span>{" "}
            <strong> ({result.score}%)</strong>
          </div>
          <div className="px-6 py-4 bg-[var(--nb-blue)] text-white border-4 border-black shadow-[var(--shadow-sm)]">
            <strong>Time Taken:</strong> {Math.floor(result.timeTaken / 60)}m{" "}
            {result.timeTaken % 60}s
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-4 relative z-10">
          <Button
            onClick={() => navigate(`/leaderboard/${quizId}`)}
            variant="secondary"
            className="py-4 px-6 text-lg font-black bg-white text-black border-4 border-black shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            <TrophyIcon className="w-5 h-5" /> View Quiz Leaderboard
          </Button>
          <Button onClick={() => navigate("/student")} variant="secondary" className="py-4 px-6 text-lg font-black bg-white text-black border-4 border-black shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
            Back to Dashboard
          </Button>
        </div>
      </Card>

      <Card className="border-4 border-black shadow-[var(--shadow-md)] bg-white p-6 sm:p-8">
        <h3 className="text-3xl font-black uppercase text-black mb-8 border-b-4 border-black pb-4">Answer Review</h3>
        <div className="space-y-6">
          {quiz.questionPool
            .map((q: any) => {
              // Normalize the question ID to handle both _id and id
              const questionId = q._id || q.id;
              const studentAnswer = result.answers.find(
                (a: any) => a.questionId === questionId
              );
              return studentAnswer
                ? { ...q, id: questionId, studentAnswer }
                : null;
            })
            .filter(Boolean)
            .map((questionData: any, index: number) => {
              const question = questionData;
              const studentAnswer = questionData.studentAnswer;

              const isCorrect = studentAnswer.isCorrect;
              const selectedOption = studentAnswer.selectedOptionIndex;
              const correctOption = question.correctAnswerIndex;

              return (
                <div key={question.id} className={`p-6 border-4 border-black shadow-[var(--shadow-sm)] bg-white ${isCorrect ? 'border-l-8 border-l-green-400' : 'border-l-8 border-l-red-400'}`}>
                  <p className="text-xl font-black uppercase text-black mb-6 leading-snug">
                    <span className="bg-[var(--nb-yellow)] border-2 border-black px-2 mr-2">Q{index + 1}</span> {question.questionText}
                  </p>
                  <div className="space-y-4">
                    {question.type === 'text' ? (
                      <div className="space-y-4">
                        <div className={`p-4 border-4 border-black ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                          <p className="text-sm font-black uppercase text-black mb-2 opacity-60">Your Answer:</p>
                          <p className="flex items-center gap-3 text-lg font-bold text-black">
                            {isCorrect ? (
                              <CheckCircleIcon className="w-8 h-8 text-green-500 shrink-0" />
                            ) : (
                              <XCircleIcon className="w-8 h-8 text-red-500 shrink-0" />
                            )}
                            {studentAnswer.textAnswer || "No answer provided"}
                          </p>
                        </div>
                        {!isCorrect && (
                          <div className="p-4 border-4 border-black bg-white">
                            <p className="text-sm font-black uppercase text-black mb-2 opacity-60">Correct Answer:</p>
                            <p className="text-lg font-bold text-black border-l-4 border-green-500 pl-4">{question.correctTextAnswer}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      question.options.map(
                        (option: string, optIndex: number) => (
                          <div
                            key={optIndex}
                            className={`p-4 border-4 border-black flex items-start gap-4 transition-all ${optIndex === correctOption ? "bg-green-100" : "bg-white"
                              } ${optIndex === selectedOption && !isCorrect
                                ? "bg-red-100"
                                : ""
                              }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {optIndex === correctOption && (
                                <CheckCircleIcon className="w-8 h-8 text-green-500" />
                              )}
                              {optIndex === selectedOption && !isCorrect && (
                                <XCircleIcon className="w-8 h-8 text-red-500" />
                              )}
                              {optIndex !== correctOption &&
                                optIndex !== selectedOption && (
                                  <div className="w-8 h-8 border-4 border-black bg-white" />
                                )}
                            </div>
                            <span
                              className={`text-lg font-bold text-black ${optIndex === selectedOption || optIndex === correctOption ? "font-black" : ""
                                }`}
                            >
                              {option}
                            </span>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </AnimatedWrapper >
  );
};

export default QuizResults;
