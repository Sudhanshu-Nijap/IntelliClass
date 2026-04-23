import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import type { Quiz } from "../../types";
import { Button, Card, Modal, Spinner, useToast } from "../../components/ui";
import {
  UserGroupIcon,
  CalendarIcon,
  DocumentDownloadIcon,
  SparklesIcon,
  TrashIcon,
  PencilIcon,
} from "../../components/Icons";
import jsPDF from "jspdf";
import MultiSelectDropdown from "../../components/shared/MultiSelectDropdown";
import { useAppContext } from "../../context/AppContext";

const AdminQuizzesPage: React.FC = () => {
  const { addToast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([] as any);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [timeLimit, setTimeLimit] = useState<number>(10);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  const studentOptions = useMemo(() => students.map(s => ({ id: s._id || s.id, name: s.name })), [students]);
  const { deleteQuiz: ctxDeleteQuiz, updateQuiz: ctxUpdateQuiz } = useAppContext();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingQuiz, setEditingQuiz] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [qs, us] = await Promise.all([api.getQuizzes(), api.getUsers()]);
        setQuizzes(qs || []);
        setStudents((us || []).filter((u: any) => u.role === "STUDENT"));
      } catch (e) {
        setError("Failed to load quizzes/users");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isAssignOpen) {
        setIsAssignOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAssignOpen]);

  const createDoc = async (quiz: any) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let y = 20;

    // function to check space & create new page
    const checkPageBreak = (heightNeeded = 10) => {
      if (y + heightNeeded > pageHeight - 20) {
        pdf.addPage();
        y = 20;
      }
    };

    // -------- TITLE ----------
    pdf.setFontSize(25);
    pdf.setFont("Times", "bold");
    pdf.text(quiz.title, pageWidth / 2, y, {
      align: "center",
      maxWidth: maxLineWidth,
    });
    y += 10;

    pdf.setFontSize(12);
    pdf.setFont("Times", "italic");
    pdf.text("Generated Quiz Document", pageWidth / 2, y, { align: "center" });
    y += 10;

    // separator line
    pdf.setDrawColor(0);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    // -------- QUESTIONS ----------
    quiz.questionPool.forEach((q, questionIndex) => {
      checkPageBreak(20);

      // Question number + text
      pdf.setFont("Times", "bold");
      pdf.setFontSize(16);

      const questionTitle = `${questionIndex + 1}. ${q.questionText}`;
      const wrappedQuestion = pdf.splitTextToSize(questionTitle, maxLineWidth);

      wrappedQuestion.forEach((line) => {
        checkPageBreak();
        pdf.text(line, margin, y);
        y += 8;
      });

      pdf.setFontSize(12);
      pdf.setFont("Times", "normal");

      y += 3;

      // -------- OPTIONS ----------
      q.options.forEach((option, idx) => {
        checkPageBreak();

        if (idx === q.correctAnswerIndex) pdf.setTextColor(0, 128, 0);
        else pdf.setTextColor(0);

        const optionLine = `• ${option}`;
        const wrappedOption = pdf.splitTextToSize(
          optionLine,
          maxLineWidth - 10
        );

        wrappedOption.forEach((line) => {
          pdf.text(line, margin + 5, y);
          y += 6;
        });
      });

      pdf.setTextColor(0);
      y += 5;
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;
    });

    // -------- FOOTER (PAGE NUMBERS) ----------
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      (pdf as any).setPage(i);
      pdf.setFontSize(10);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });
    }

    pdf.save("document.pdf");
  };

  const openAssign = async (quiz: any) => {
    setSelectedQuiz(quiz);
    setIsAssignOpen(true);
    try {
      const assignment = await api.getAssignmentByQuiz(quiz._id);
      setSelectedStudentIds((assignment?.studentIds || []) as string[]);
      if (assignment?.deadline) {
        setDeadline(new Date(assignment.deadline).toISOString().split("T")[0]);
      }
      if (typeof assignment?.timeLimit === "number")
        setTimeLimit(assignment.timeLimit);
      setIsLive(!!assignment?.isLive);
    } catch (e) {
      // no assignment yet -> keep defaults
      setSelectedStudentIds([]);
    }
  };

  const applyAssignment = async (nextStudentIds: string[]) => {
    if (!selectedQuiz) return;
    try {
      setSubmitting(true);
      await api.updateAssignmentByQuiz(selectedQuiz._id, {
        studentIds: nextStudentIds,
        deadline: isLive ? undefined : new Date(deadline).toISOString(),
        timeLimit: isLive ? 5 : timeLimit,
        isLive,
      });
      addToast("Assignment updated", "success");
    } catch (e) {
      addToast("Failed to update assignment", "error");
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz? All associated assignments will also be removed.")) return;
    try {
      await ctxDeleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => (q._id || q.id) !== quizId));
      addToast("Quiz deleted successfully", "success");
    } catch (err) {
      addToast("Failed to delete quiz", "error");
    }
  };

  const openEdit = (quiz: any) => {
    setEditingQuiz(quiz);
    setEditTitle(quiz.title);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingQuiz || !editTitle.trim()) return;
    try {
      setSubmitting(true);
      await ctxUpdateQuiz(editingQuiz._id, { title: editTitle });
      setQuizzes((prev) => prev.map((q) => (q._id || q.id) === editingQuiz._id ? { ...q, title: editTitle } : q));
      setIsEditOpen(false);
      addToast("Quiz title updated", "success");
    } catch (err) {
      addToast("Failed to update quiz", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const quizzesList = useMemo(() => quizzes || [], [quizzes]);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl sm:text-5xl font-black uppercase text-black border-b-4 border-black pb-4">
        All Quizzes
      </h2>
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Spinner /> Loading...
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          {quizzesList.map((q: any) => (
            <Card key={q._id} className="hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150">
              <div className="flex flex-col gap-4">
                <div className="border-b-4 border-black pb-2">
                  <h3 className="text-xl font-black uppercase text-black break-words">{q.title}</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase mt-1">
                    Questions: {q.questionPool?.length || 0}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => openEdit(q)} className="w-full text-xs font-black">
                    <PencilIcon className="w-4 h-4" /> Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(q._id)} className="w-full text-xs font-black">
                    <TrashIcon className="w-4 h-4" /> Delete
                  </Button>
                  <Button variant="secondary" onClick={() => openAssign(q)} className="w-full text-xs font-black">
                    <UserGroupIcon className="w-4 h-4" /> Assign
                  </Button>
                  <Button variant="primary" onClick={() => createDoc(q)} className="w-full text-xs font-black">
                    <DocumentDownloadIcon className="w-4 h-4" /> PDF
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {quizzesList.length === 0 && (
            <Card>
              <p className="text-slate-300">No quizzes yet.</p>
            </Card>
          )}
        </div>
      )}

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Quiz"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Quiz Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2 border-4 border-black font-bold focus:outline-none bg-white"
            />
          </div>
          <Button onClick={handleUpdate} disabled={submitting} className="w-full">
            {submitting ? <Spinner /> : "Update Quiz"}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Assign Quiz: ${selectedQuiz?.title || ""}`}
      >
        <div className="space-y-4">
          <div>
            <div className="space-y-3">
              <MultiSelectDropdown
                options={studentOptions}
                selectedIds={selectedStudentIds}
                onSelect={async (next) => {
                  setSelectedStudentIds(next);
                  try {
                    await applyAssignment(next);
                  } catch { }
                }}
                placeholder="Choose students..."
                label="Assign Students"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-4">
          <div className="flex flex-wrap gap-6 items-center">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isLive}
                  onChange={(e) => setIsLive(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${isLive ? 'bg-primary-500' : 'bg-slate-700'}`} />
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isLive ? 'translate-x-5' : ''}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200">Live Session</span>
                <span className="text-[10px] text-slate-500">Enable real-time synchronization</span>
              </div>
            </label>

            {!isLive && (
              <div className="flex-1 min-w-[150px]">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  <CalendarIcon className="w-3.5 h-3.5" /> Deadline
                </div>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full p-2 text-sm rounded-lg bg-slate-900/50 border border-slate-700 focus:border-primary-500 transition-colors text-slate-200"
                />
              </div>
            )}

            <div className="flex-1 min-w-[150px]">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                <SparklesIcon className="w-3.5 h-3.5" /> Time Limit (mins)
              </div>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                className="w-full p-2 text-sm rounded-lg bg-slate-900/50 border border-slate-700 focus:border-primary-500 transition-colors text-slate-200"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={() => setIsAssignOpen(false)}
          disabled={submitting}
          className="w-full"
        >
          Close
        </Button>
      </Modal>
    </div>
  );
};

export default AdminQuizzesPage;
