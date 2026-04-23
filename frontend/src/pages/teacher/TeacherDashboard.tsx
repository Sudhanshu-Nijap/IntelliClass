import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAppContext } from "../../context/AppContext";
import { Button, Card, Spinner, Tabs, useToast, Modal } from "../../components/ui";
import {
  TrophyIcon,
  UploadIcon,
  XCircleIcon,
  PlusCircleIcon,
  CalendarIcon,
} from "../../components/Icons";
import type { Difficulty } from "../../types";
// Remove Gemini service imports
import { BASE, api } from "../../services/api";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import MultiSelectDropdown from "../../components/shared/MultiSelectDropdown";
import Calendar from "../../components/shared/Calendar";

const TeacherDashboard = () => {
  const { users, results, addResource, removeUser, addQuiz } = useAppContext();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Overview");
  const [isCreating, setIsCreating] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [isGeneratingFromPDF, setIsGeneratingFromPDF] = useState(false);

  const [manualTitle, setManualTitle] = useState("");
  const [manualQuestions, setManualQuestions] = useState<any>([
    { questionText: "", type: 'multiple-choice', options: ["", "", "", ""], correctAnswerIndex: 0, correctTextAnswer: "" },
  ]);

  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [error, setError] = useState("");

  const students = useRef<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  // Add Student Modal State
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<{ title: string; questions: any[] } | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const allStudents = useMemo(() => users.filter((u) => u.role === "STUDENT").map(u => ({ id: u._id || u.id, name: u.name })), [users]);

  useEffect(() => {
    students.current = users.filter((u) => u.role === "STUDENT");
  }, [users]);

  const handleGenerateQuizFromFile = async (file: File) => {
    setIsGeneratingFromPDF(true);
    setUploadedFileName(file.name);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("numQuestions", numQuestions.toString());
      formData.append("title", file.name.replace(/\.[^/.]+$/, "") + " Quiz");

      const response = await fetch(`${BASE}/api/quizzes/generate-from-file`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate quiz from file");
      }

      const data = await response.json();
      setPreviewQuiz(data);
      addToast("Quiz successfully generated! Review the questions below.", "success");
    } catch (err: any) {
      setError(err.message || "Failed to generate quiz");
      addToast(err.message || "Error generating quiz", "error");
    } finally {
      setIsGeneratingFromPDF(false);
    }
  };

  const handleConfirmPDFQuiz = async () => {
    if (!previewQuiz) return;
    setIsGeneratingFromPDF(true);
    try {
      await addQuiz(
        { title: previewQuiz.title, questionPool: previewQuiz.questions } as any,
        {
          studentIds: selectedStudentIds,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          timeLimit: 15,
          isLive: false,
          numQuestionsToAssign: previewQuiz.questions.length
        } as any
      );
      addToast("Quiz successfully assigned to students!", "success");
      setPreviewQuiz(null);
      setUploadedFileName(null);
      setSelectedStudentIds([]);
    } catch (err: any) {
      addToast(err.message || "Failed to assign quiz", "error");
    } finally {
      setIsGeneratingFromPDF(false);
    }
  };

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const [aRes, qRes] = await Promise.all([
          api.getAssignments(),
          api.getQuizzes()
        ]);
        setAssignments(aRes || []);
        setQuizzes(qRes || []);
      } catch (err) {
        console.error("Failed to fetch assignments:", err);
      }
    };
    fetchAssignments();
  }, []);

  const calendarEvents = useMemo(() => {
    return assignments.map(a => {
      const quiz = quizzes.find(q => String(q._id) === String(a.quizId));
      return {
        date: new Date(a.deadline),
        title: quiz ? `Quiz: ${quiz.title}` : 'Quiz Deadline',
        type: 'quiz' as const,
        onClick: () => {
          if (quiz) navigate(`/admin/quizzes`);
        }
      };
    });
  }, [assignments, quizzes, navigate]);

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentPassword.trim()) {
      addToast("Please provide both username and password.", "error");
      return;
    }

    if (newStudentPassword.length < 6) {
      addToast("Password must be at least 6 characters long.", "error");
      return;
    }

    setIsAddingStudent(true);
    try {
      const response = await fetch(`${BASE}/api/user/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newStudentName,
          password: newStudentPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add student");
      }

      const newStudent = await response.json();
      students.current = [...students.current, newStudent];

      addToast(`Student "${newStudentName}" added successfully!`, "success");
      addToast(
        `Credentials - Username: ${newStudentName}, Password: ${newStudentPassword}`,
        "info"
      );

      // Reset form and close modal
      setNewStudentName("");
      setNewStudentPassword("");
      setIsAddStudentModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast((err as Error).message || "Failed to add student", "error");
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleUploadResourceFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResource(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", file.name);
      const resp = await fetch(`${BASE}/api/resources/upload`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      const resource = await resp.json();
      addResource({
        ...(resource as any),
        _id: resource._id || resource.id,
        id: resource._id || resource.id,
      } as any);
      addToast("Resource uploaded and added to Resources", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to upload resource", "error");
    } finally {
      setUploadingResource(false);
    }
  };

  const handleRevokeStudent = (userId: string) => {
    if (
      window.confirm("Are you sure you want to revoke this student's access?")
    ) {
      removeUser(userId);
      addToast("Student access revoked.", "success");
    }
  };

  const leaderboard = useMemo(() => {
    return [...students.current].sort((a, b) => b.points - a.points);
  }, [students.current]);

  const studentPerformance = useMemo(() => {
    return students.current.map((student) => {
      const studentResults = results.filter((r) => r.userId === student.id);
      const avgScore =
        studentResults.length > 0
          ? studentResults.reduce((acc, r) => acc + r.score, 0) /
          studentResults.length
          : 0;
      return {
        name: student.name,
        avgScore: Math.round(avgScore),
        quizzesTaken: studentResults.length,
      };
    });
  }, [students.current, results]);

  const rankBadges = ["🥇", "🥈", "🥉"];

  return (
    <AnimatedWrapper className="space-y-6 sm:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b-4 border-black">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-black leading-tight">Teacher Dashboard</h2>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Button
            onClick={() => navigate("/admin/quizzes")}
            variant="secondary"
            className="flex-1 sm:flex-none whitespace-nowrap uppercase font-black px-4 py-2"
            style={{ textShadow: "-1px -1px 0 var(--nb-yellow)" }}
          >
            Quizzes
          </Button>
          <Button onClick={() => navigate("/admin/polls")} variant="secondary" className="flex-1 sm:flex-none whitespace-nowrap uppercase font-black px-4 py-2" style={{ textShadow: "-1px -1px 0 var(--nb-blue)" }}>
            Polls
          </Button>
          <Button
            onClick={() => setIsCalendarModalOpen(true)}
            variant="secondary"
            className="flex-1 sm:flex-none whitespace-nowrap uppercase font-black px-4 py-2"
            style={{ textShadow: "-1px -1px 0 var(--nb-pink)" }}
          >
            <CalendarIcon className="w-5 h-5 mr-2" />
            Calendar
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Tabs
          tabs={["Overview", "Manage Students", "Create Quiz", "Upload Resources"]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>

      <div className="mt-6">



        {activeTab === "Overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="order-2 lg:order-1">
              <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2">
                Leaderboard
              </h3>
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <StaggeredList className="space-y-2">
                  {leaderboard.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex justify-between items-center p-4 bg-white border-4 border-black shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none cursor-pointer transition-all duration-150 shrink-0"
                      onClick={() => navigate(`/student/${student.id}`)}
                    >
                      <span className="font-medium flex items-center gap-3 text-sm sm:text-base">
                        <span
                          className={`text-lg sm:text-xl w-6 text-center ${index < 3 ? "" : "text-slate-400"
                            }`}
                        >
                          {rankBadges[index] || index + 1}
                        </span>
                        {student.name}
                      </span>
                      <span className="font-bold text-yellow-400 flex items-center gap-1 text-sm sm:text-base">
                        <TrophyIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        {student.points}
                      </span>
                    </div>
                  ))}
                </StaggeredList>
              </div>
            </Card>
            <Card className="order-1 lg:order-2 overflow-hidden">
              <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2">
                Performance Overview
              </h3>
              <div className="h-[250px] sm:h-[300px] w-full" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={studentPerformance}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        fontSize: "12px"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar
                      dataKey="avgScore"
                      fill="#4f46e5"
                      name="Avg Score %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div >
        )}


        {/* Calendar Modal */}
        <Modal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          title="Quiz Calendar"
        >
          <div className="p-0 overflow-hidden">
            <Calendar events={calendarEvents} compact={true} />
          </div>
        </Modal>

        {
          activeTab === "Manage Students" && (
            <Card>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b-4 border-black pb-2">
                <h3 className="text-2xl font-black uppercase text-black">Student Roster</h3>
                <Button
                  onClick={() => setIsAddStudentModalOpen(true)}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  Add Student
                </Button>
              </div>
              <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <StaggeredList className="space-y-3">
                  {students.current.map((student) => (
                    <div
                      key={student._id}
                      className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-white border-4 border-black shadow-[var(--shadow-sm)] gap-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150"
                    >
                      <span className="font-black text-lg uppercase text-black">{student.name}</span>
                      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
                        {editingUserId === student._id ? (
                          <>
                            <input
                              type="password"
                              placeholder="New password"
                              className="p-2 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all duration-150 text-sm"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                className="flex-1"
                                onClick={async () => {
                                  if (!newPassword.trim()) return;
                                  await api.updateUserPassword(
                                    student._id,
                                    newPassword
                                  );
                                  setEditingUserId(null);
                                  setNewPassword("");
                                  addToast("Password updated", "success");
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => {
                                  setEditingUserId(null);
                                  setNewPassword("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => setEditingUserId(student._id)}
                              className="text-xs sm:text-sm"
                            >
                              Edit Password
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => handleRevokeStudent(student._id)}
                              className="text-xs sm:text-sm"
                            >
                              Revoke Access
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </StaggeredList>
              </div>
            </Card>
          )

        }

        {
          activeTab === "Create Quiz" && (
            <div className="space-y-8">
              <Card>
                <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2 flex items-center gap-3">
                  <UploadIcon className="w-8 h-8 text-[var(--nb-blue)]" />
                  Generate Quiz from File (Rule-Based)
                </h3>
                <p className="text-sm font-bold text-black mb-4 px-2">Supports: PDF, Word (docx), PowerPoint (pptx), Excel (xlsx), and Text (txt)</p>
                <div className="space-y-6">
                  <div className="p-8 border-4 border-black border-dashed bg-white hover:bg-slate-50 transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer" onClick={() => pdfInputRef.current?.click()}>
                    <UploadIcon className="w-12 h-12 text-slate-400" />
                    <p className="font-black uppercase text-slate-500">Click to upload Document</p>
                    <p className="text-xs text-slate-400">Content will be processed Locally & Safely (No-LLM)</p>
                  </div>

                  <input
                    type="file"
                    accept=".pdf,.docx,.pptx,.xlsx,.txt"
                    className="hidden"
                    ref={pdfInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGenerateQuizFromFile(file);
                    }}
                  />

                  <div className="flex flex-col sm:flex-row gap-6 items-center bg-[var(--nb-yellow)] p-4 border-4 border-black">
                    <label className="block">
                      <span className="block font-black uppercase text-black mb-1">Questions:</span>
                      <input
                        type="number"
                        value={numQuestions}
                        onChange={(e) =>
                          setNumQuestions(Math.max(1, parseInt(e.target.value)))
                        }
                        className="w-28 p-2 border-4 border-black font-bold focus:outline-none bg-white"
                      />
                    </label>

                    <div className="grow"></div>

                    <MultiSelectDropdown
                      options={allStudents}
                      selectedIds={selectedStudentIds}
                      onSelect={setSelectedStudentIds}
                      placeholder="Assign to..."
                      label="Assign Students"
                    />

                    {isGeneratingFromPDF && (
                      <div className="flex items-center gap-2">
                        <Spinner />
                        <span className="font-bold uppercase animate-pulse">Processing File...</span>
                      </div>
                    )}
                  </div>
                  {error && <p className="text-red-500 font-bold">{error}</p>}

                  {previewQuiz && (
                    <div className="mt-8 p-6 border-4 border-black bg-white shadow-[var(--shadow-sm)]">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 border-b-4 border-black pb-2 gap-2">
                        <h4 className="text-xl font-black uppercase text-black">
                          Generated Quiz Preview
                        </h4>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 border-2 border-black">File: {uploadedFileName}</span>
                      </div>

                      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                        {previewQuiz.questions.map((q: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 border-4 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                            <p className="font-black mb-2 text-black uppercase">{idx + 1}. {q.questionText}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt: string, oIdx: number) => (
                                <div key={oIdx} className={`text-xs p-2 border-2 border-black font-bold ${q.correctAnswerIndex === oIdx ? 'bg-green-200 border-green-600' : 'bg-white'}`}>
                                  {opt} {q.correctAnswerIndex === oIdx && "✓"}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                          onClick={handleConfirmPDFQuiz}
                          variant="primary"
                          className="flex-1 uppercase font-black"
                          disabled={isGeneratingFromPDF}
                        >
                          {isGeneratingFromPDF ? <Spinner /> : "Confirm & Assign Quiz"}
                        </Button>
                        <Button
                          onClick={() => {
                            setPreviewQuiz(null);
                            setUploadedFileName(null);
                          }}
                          variant="secondary"
                          className="flex-1 uppercase font-black"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b-4 border-black pb-2">
                  <h3 className="text-2xl font-black uppercase text-black">Create Quiz Manually</h3>

                  <MultiSelectDropdown
                    options={allStudents}
                    selectedIds={selectedStudentIds}
                    onSelect={setSelectedStudentIds}
                    placeholder="Choose students..."
                    label="Assign Students"
                  />
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Quiz Title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full p-4 border-4 border-black font-bold text-lg focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all duration-150 bg-white"
                  />
                  <div className="space-y-4">
                    {manualQuestions.map((q: any, qIndex: number) => (
                      <div
                        key={qIndex}
                        className="p-6 border-4 border-black bg-[var(--nb-yellow)] space-y-4 relative shadow-[var(--shadow-sm)]"
                      >
                        {manualQuestions.length > 1 && (
                          <button
                            onClick={() =>
                              setManualQuestions((prev: any[]) =>
                                prev.filter((_, i) => i !== qIndex)
                              )
                            }
                            className="absolute top-2 right-2 text-red-500 hover:text-red-600"
                          >
                            <XCircleIcon className="w-6 h-6" />
                          </button>
                        )}
                        <textarea
                          value={q.questionText}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[qIndex].questionText = e.target.value;
                            setManualQuestions(updated);
                          }}
                          placeholder={`Question ${qIndex + 1}`}
                          className="w-full p-3 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all duration-150 custom-scrollbar bg-white min-h-[100px]"
                        />
                        <div className="flex flex-col sm:flex-row gap-4">
                          <label className="block w-full sm:w-auto">
                            <span className="block font-black uppercase text-black mb-1">Question Type</span>
                            <select
                              value={q.type || 'multiple-choice'}
                              onChange={(e) => {
                                const updated = [...manualQuestions];
                                updated[qIndex].type = e.target.value;
                                setManualQuestions(updated);
                              }}
                              className="w-full sm:w-48 p-2 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all duration-150 bg-white"
                            >
                              <option value="multiple-choice">Multiple Choice</option>
                              <option value="text">Text (Open Ended)</option>
                            </select>
                          </label>
                        </div>

                        {(q.type === 'multiple-choice' || !q.type) ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt: string, optIndex: number) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${qIndex}`}
                                  checked={q.correctAnswerIndex === optIndex}
                                  onChange={() => {
                                    const updated = [...manualQuestions];
                                    updated[qIndex].correctAnswerIndex = optIndex;
                                    setManualQuestions(updated);
                                  }}
                                  className="h-6 w-6 border-4 border-black text-black focus:ring-0 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  placeholder={`Option ${optIndex + 1}`}
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...manualQuestions];
                                    updated[qIndex].options[optIndex] =
                                      e.target.value;
                                    setManualQuestions(updated);
                                  }}
                                  className={`w-full p-3 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all duration-150 ${q.correctAnswerIndex === optIndex ? 'bg-green-100' : 'bg-white'}`}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="block">
                              <span style={{ color: 'var(--text-muted)' }}>Correct Answer (Text)</span>
                              <input
                                type="text"
                                placeholder="Enter the correct answer"
                                value={q.correctTextAnswer || ""}
                                onChange={(e) => {
                                  const updated = [...manualQuestions];
                                  updated[qIndex].correctTextAnswer = e.target.value;
                                  setManualQuestions(updated);
                                }}
                                className="w-full p-2 border rounded-md theme-transition"
                                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                              />
                            </label>
                            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                              Students will need to type this answer exactly (case-insensitive) to get points.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t-4 border-black">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setManualQuestions((prev: any[]) => [
                          ...prev,
                          { questionText: "", type: 'multiple-choice', options: ["", "", "", ""], correctAnswerIndex: 0, correctTextAnswer: "" },
                        ])
                      }
                    >
                      <PlusCircleIcon className="w-5 h-5" /> Add Question
                    </Button>

                    <div className="hidden md:block grow"></div>

                    <Button
                      onClick={async () => {
                        if (!manualTitle.trim()) {
                          addToast("Please enter a quiz title", "error");
                          return;
                        }
                        setIsCreating(true);
                        try {
                          await addQuiz(
                            { title: manualTitle, questionPool: manualQuestions } as any,
                            {
                              studentIds: selectedStudentIds,
                              deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                              timeLimit: 10,
                              isLive: false,
                              numQuestionsToAssign: manualQuestions.length
                            } as any
                          );
                          setManualTitle("");
                          setManualQuestions([
                            {
                              questionText: "",
                              options: ["", "", "", ""],
                              correctAnswerIndex: 0,
                            }
                          ]);
                          setSelectedStudentIds([]);
                          addToast("Manual quiz created and assigned successfully!", "success");
                        } catch (e: any) {
                          addToast(e.message || "Failed to create quiz", "error");
                        } finally {
                          setIsCreating(false);
                        }
                      }}
                      disabled={isCreating}
                      className="w-full md:w-auto px-10 bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/20"
                    >
                      {isCreating ? <Spinner /> : "Create Quiz"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )
        }

        {
          activeTab === "Upload Resources" && (
            <Card>
              <h3 className="text-xl font-semibold mb-4">Upload Resource File</h3>
              <p className="mb-2" style={{ color: 'var(--text-muted)' }}>
                Upload Word/Excel/PPT/Text files to Resources for students to
                download.
              </p>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <Button
                    variant="secondary"
                    disabled={uploadingResource}
                    onClick={() => resourceInputRef.current?.click()}
                  >
                    <UploadIcon className="w-5 h-5" /> Upload Resource
                  </Button>
                </label>
                <input
                  id="resource-upload"
                  type="file"
                  accept=".docx,.xlsx,.pptx,.txt,.pdf"
                  className="hidden"
                  onChange={handleUploadResourceFile}
                  ref={resourceInputRef}
                />
              </div>
            </Card>
          )
        }
      </div>

      <Modal
        isOpen={isAddStudentModalOpen}
        onClose={() => {
          setIsAddStudentModalOpen(false);
          setNewStudentName("");
          setNewStudentPassword("");
        }}
        title="Add New Student"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Student Username
            </label>
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Enter username"
              className="w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 theme-transition"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={newStudentPassword}
              onChange={(e) => setNewStudentPassword(e.target.value)}
              placeholder="Enter password (min 6 characters)"
              className="w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 theme-transition"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Make sure to save these credentials - they will be shown once
              after creation
            </p>
          </div>
          <Button
            onClick={handleAddStudent}
            className="w-full"
            disabled={isAddingStudent}
          >
            {isAddingStudent ? (
              <>
                <Spinner /> Adding Student...
              </>
            ) : (
              "Add Student"
            )}
          </Button>
        </div>
      </Modal>
    </AnimatedWrapper >
  );
};

export default TeacherDashboard;
