import React, { useMemo } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { Roles } from "../types";

import HomePage from "../HomePage";
import LoginPage from "../pages/LoginPage";
import StudentDashboard from "../pages/student/StudentDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminHistoryPage from "../pages/admin/AdminHistoryPage";
import AdminQuizzesPage from "../pages/admin/AdminQuizzesPage";
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import QuizTaker from "../pages/student/QuizTaker";
import QuizResults from "../pages/student/QuizResults";
import PollTaker from "../pages/shared/PollTaker";
import PollsAdmin from "../pages/admin/PollsAdmin";
import LeaderboardPage from "../pages/shared/LeaderboardPage";
import ResourcesPage from "../pages/shared/ResourcesPage";
import StudentListPage from "../pages/admin/StudentListPage";
import StudentProfilePage from "../pages/shared/StudentProfilePage";
import DiscussionListPage from "../pages/shared/DiscussionListPage";
import DiscussionPostPage from "../pages/shared/DiscussionPostPage";
import ClassroomsPage from "../pages/shared/ClassroomsPage";
import ClassroomDetailPage from "../pages/shared/ClassroomDetailPage";
import Learning from "../pages/shared/Learning";

import { Header } from "../components/shared/Header";
import { Spinner } from "../components/ui";
import { SmartAssistant } from "../components/shared/SmartAssistant";

const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div
      className="min-h-screen bg-grid theme-transition"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <Header />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
      <SmartAssistant />
    </div>
  );
};

const AppRouter = () => {
  const { currentUser } = useAppContext();

  const userDashboardPath = useMemo(() => {
    if (!currentUser) return "/";
    switch (currentUser.role) {
      case Roles.ADMIN:
        return "/admin";
      case Roles.TEACHER:
        return "/teacher";
      case Roles.STUDENT:
        return "/student";
      default:
        return "/";
    }
  }, [currentUser]);

  // A simple check to see if context is ready
  if (useAppContext() === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <HashRouter>
      {currentUser ? (
        <Layout>
          <Routes>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/quizzes" element={<AdminQuizzesPage />} />
            <Route path="/admin/history" element={<AdminHistoryPage />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/quiz/:assignmentId" element={<QuizTaker />} />
            <Route path="/poll/:pollId" element={<PollTaker />} />
            <Route path="/admin/polls" element={<PollsAdmin />} />
            <Route path="/results/:quizId" element={<QuizResults />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/leaderboard/:quizId" element={<LeaderboardPage />} />
            {currentUser.role === Roles.STUDENT && (
              <>
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/learning" element={<Learning />} />
              </>
            )}
            <Route path="/how-to-use" element={<HomePage />} />
            <Route path="/about-us" element={<HomePage />} />
            <Route path="/students" element={<StudentListPage />} />
            <Route
              path="/student/:studentId"
              element={<StudentProfilePage />}
            />
            <Route path="/discussions" element={<DiscussionListPage />} />
            <Route
              path="/discussions/:postId"
              element={<DiscussionPostPage />}
            />
            {currentUser.role !== Roles.ADMIN && (
              <>
                <Route path="/classrooms" element={<ClassroomsPage />} />
                <Route path="/classrooms/:id" element={<ClassroomDetailPage />} />
              </>
            )}
            <Route path="*" element={<Navigate to={userDashboardPath} />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </HashRouter>
  );
};

export default AppRouter;
