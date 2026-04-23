import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui";
import type { Quiz } from "../../types";
// Remove Gemini service imports
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import MultiSelectDropdown from "../../components/shared/MultiSelectDropdown";
import { Button, Card, Modal, Spinner, Tabs } from "../../components/ui";
import { BASE } from "../../services/api";
import {
  UploadIcon,
  XCircleIcon,
  PlusCircleIcon,
} from "../../components/Icons";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { addQuiz, addResource, removeUser } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("Manage Students");

  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [uploadingResource, setUploadingResource] = useState(false);
  const resourceInputRef = useRef<HTMLInputElement | null>(null);
  // Edit password state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");

  // Teacher modal states
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const data = await api.getUsers();
      const sData = (data || []).filter((u: any) => u.role === "STUDENT");
      const tData = (data || []).filter((u: any) => u.role === "TEACHER");
      setStudents(sData);
      setTeachers(tData);
      setStudentOptions(sData.map((s: any) => ({ id: s._id || s.id, name: s.name })));
    };
    fetchData();
  }, []);

  const [studentOptions, setStudentOptions] = useState<{ id: string, name: string }[]>([]);



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

  const handleRevokeTeacher = (userId: string) => {
    if (
      window.confirm("Are you sure you want to revoke this teacher's access?")
    ) {
      removeUser(userId);
      addToast("Teacher access revoked.", "success");
      setTeachers((prev) => prev.filter((t) => t._id !== userId));
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacherName.trim() || !newTeacherPassword.trim()) {
      addToast("Please provide both username and password.", "error");
      return;
    }

    if (newTeacherPassword.length < 6) {
      addToast("Password must be at least 6 characters long.", "error");
      return;
    }

    setIsAddingTeacher(true);
    try {
      const response = await fetch(`${BASE}/api/user/teacher-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newTeacherName,
          password: newTeacherPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add teacher");
      }

      const newTeacher = await response.json();
      setTeachers((prev) => [...prev, newTeacher]);

      addToast(`Teacher "${newTeacherName}" added successfully!`, "success");
      addToast(
        `Credentials - Username: ${newTeacherName}, Password: ${newTeacherPassword}`,
        "info"
      );

      // Reset form and close modal
      setNewTeacherName("");
      setNewTeacherPassword("");
      setIsAddTeacherModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast((err as Error).message || "Failed to add teacher", "error");
    } finally {
      setIsAddingTeacher(false);
    }
  };

  return (
    <AnimatedWrapper className="space-y-8">
      <div className="flex items-center justify-between pb-6 border-b-4 border-black">
        <h2 className="text-3xl sm:text-5xl font-black uppercase text-black">Admin Dashboard</h2>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate("/admin/quizzes")} variant="secondary" className="whitespace-nowrap uppercase font-black" style={{ textShadow: "-1px -1px 0 var(--nb-yellow)" }}>
            View All Quizzes
          </Button>
          <Button onClick={() => navigate("/admin/polls")} variant="secondary" className="whitespace-nowrap uppercase font-black" style={{ textShadow: "-1px -1px 0 var(--nb-blue)" }}>
            Manage Polls
          </Button>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Tabs
            tabs={["Manage Students", "Manage Teachers", "Upload Resources"]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
        <div className="mt-6">
          {activeTab === "Upload Resources" && (
            <div className="space-y-8">
              <Card>
                <h3 className="text-xl font-semibold mb-4">
                  Upload Resource File
                </h3>
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
            </div>
          )}
          {activeTab === "Manage Students" && (
            <Card>
              <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2">Student Roster</h3>
              <StaggeredList className="space-y-4">
                {students.map((student: any) => (
                  <div
                    key={student._id}
                    className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-white border-4 border-black shadow-[var(--shadow-sm)] gap-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150"
                  >
                    <span className="font-black text-lg uppercase text-black">{student.name}</span>
                    <div className="flex items-center gap-2">
                      {editingUserId === student._id ? (
                        <>
                          <input
                            type="password"
                            placeholder="New password"
                            className="p-2 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all duration-150 text-sm"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Button
                            variant="secondary"
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
                            onClick={() => {
                              setEditingUserId(null);
                              setNewPassword("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setEditingUserId(student._id)}
                          >
                            Edit Password
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleRevokeStudent(student._id)}
                          >
                            Revoke Access
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </StaggeredList>
            </Card>
          )}
          {activeTab === "Manage Teachers" && (
            <Card>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b-4 border-black pb-2">
                <h3 className="text-2xl font-black uppercase text-black">Teacher Roster</h3>
                <Button
                  onClick={() => setIsAddTeacherModalOpen(true)}
                  variant="secondary"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  Add Teacher
                </Button>
              </div>
              <StaggeredList className="space-y-2">
                {teachers.map((teacher) => (
                  <div
                    key={teacher._id}
                    className="flex justify-between items-center p-3 rounded-lg theme-transition"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <span>{teacher.name}</span>
                    <div className="flex items-center gap-2">
                      {editingUserId === teacher._id ? (
                        <>
                          <input
                            type="password"
                            placeholder="New password"
                            className="p-2 rounded bg-slate-800 border border-slate-600"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              if (!newPassword.trim()) return;
                              await api.updateUserPassword(
                                teacher._id,
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
                            onClick={() => {
                              setEditingUserId(null);
                              setNewPassword("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setEditingUserId(teacher._id)}
                          >
                            Edit Password
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleRevokeTeacher(teacher._id)}
                          >
                            Revoke Access
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </StaggeredList>
            </Card>
          )}
        </div>
      </div>


      {/* Add Teacher Modal */}
      <Modal
        isOpen={isAddTeacherModalOpen}
        onClose={() => {
          setIsAddTeacherModalOpen(false);
          setNewTeacherName("");
          setNewTeacherPassword("");
        }}
        title="Add New Teacher"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Teacher Username
            </label>
            <input
              type="text"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
              placeholder="Enter username"
              className="w-full p-2 border rounded-md bg-slate-700 border-slate-600 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={newTeacherPassword}
              onChange={(e) => setNewTeacherPassword(e.target.value)}
              placeholder="Enter password (min 6 characters)"
              className="w-full p-2 border rounded-md bg-slate-700 border-slate-600 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Make sure to save these credentials - they will be shown once
              after creation
            </p>
          </div>
          <Button
            onClick={handleAddTeacher}
            className="w-full"
            disabled={isAddingTeacher}
          >
            {isAddingTeacher ? (
              <>
                <Spinner /> Adding Teacher...
              </>
            ) : (
              "Add Teacher"
            )}
          </Button>
        </div>
      </Modal>
    </AnimatedWrapper>
  );
};

export default AdminDashboard;
