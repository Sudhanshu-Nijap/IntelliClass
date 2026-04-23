import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Roles, type Role } from "../types";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../components/ui";
import { Button } from "../components/ui";

import axios from "axios";
import { BASE } from "../services/api";
import { Navbar } from "../components/Navbar";



const inputClass = `w-full px-4 py-3 text-sm font-bold border-4 border-black text-black bg-white placeholder:text-gray-400 focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all duration-150`;

const LoginPage = () => {
  const { login } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();


  const [activeRole, setActiveRole] = useState<Role>(Roles.STUDENT);
  const [studentMode, setStudentMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => { setName(""); setEmail(""); setPassword(""); };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await axios.post(`${BASE}/api/user/student-login`, { name, password });
      login(user.data);
      addToast(`Welcome back, ${user.data.user.name}!`, "success");
      navigate("/student");
    } catch (error: any) {
      if (error.response?.data?.error) {
        addToast(error.response.data.error, "error");
      } else {
        addToast("Invalid credentials or an error occurred.", "error");
      }
    } finally { setIsLoading(false); }
  };

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { addToast("Please enter a name.", "error"); return; }
    setIsLoading(true);
    try {
      const user = await axios.post(`${BASE}/api/user/signup`, { username: name, email, password });
      addToast(`Welcome, ${name}! Your account has been created.`, "success");
      login(user.data);
      navigate("/student");
    } catch (error: any) {
      if (error.response?.data?.error) {
        addToast(error.response.data.error, "error");
      } else if (error.response?.data?.message) {
        addToast(error.response.data.message, "error");
      } else {
        addToast("Failed to create account.", "error");
      }
    } finally { setIsLoading(false); }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await axios.post(`${BASE}/api/user/teacher-login`, { name, password });
      login(user.data);
      addToast(`Welcome, ${user.data.user.name}!`, "success");
      navigate(user.data.user.role === Roles.ADMIN ? "/admin" : "/teacher");
    } catch (error: any) {
      if (error.response?.data?.error) {
        addToast(error.response.data.error, "error");
      } else {
        addToast("Invalid credentials or an error occurred.", "error");
      }
    } finally { setIsLoading(false); }
  };

  const renderStudentForm = () => (
    <div>
      {/* Login / Signup toggle */}
      <div className="flex border-4 border-black p-1 gap-1 mb-6 bg-[var(--surface-2)] shadow-[var(--shadow-sm)]">
        {(["login", "signup"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => { setStudentMode(mode); resetForm(); }}
            className={`flex-1 py-2 font-black uppercase transition-all duration-150 ${studentMode === mode
              ? "bg-[var(--nb-yellow)] text-black border-4 border-black shadow-[var(--shadow-sm)] translate-y-[-2px] translate-x-[-2px]"
              : "text-[var(--text-muted)] hover:text-black border-4 border-transparent hover:border-black"
              }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <form onSubmit={studentMode === "login" ? handleStudentLogin : handleStudentSignUp} className="space-y-4">
        <div>
          <label className="block mb-1.5 text-sm font-black uppercase tracking-wide text-black">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required className={inputClass} />
        </div>
        {studentMode === "signup" && (
          <div>
            <label className="block mb-1.5 text-sm font-black uppercase tracking-wide text-black">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@gmail.com" required className={inputClass} />
          </div>
        )}
        <div>
          <label className="block mb-1.5 text-sm font-black uppercase tracking-wide text-black">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={inputClass} />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full py-4 text-lg font-black mt-4">
          {isLoading ? "Please wait..." : studentMode === "login" ? "Sign In →" : "Create Account →"}
        </Button>

      </form>
    </div>
  );


  const renderStaffForm = () => (
    <div>

      <form onSubmit={handleStaffLogin} className="space-y-4">
        <div>
          <label className="block mb-1.5 text-sm font-black uppercase tracking-wide text-black">Username</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required className={inputClass} />
        </div>
        <div>
          <label className="block mb-1.5 text-sm font-black uppercase tracking-wide text-black">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={inputClass} />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full py-4 text-lg font-black mt-4">
          {isLoading ? "Please wait..." : "Sign In →"}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-grid flex flex-col theme-transition" style={{ background: "var(--bg)" }}>
      <Navbar />


      <div className="flex flex-col items-center justify-center p-4 py-16 sm:py-32">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter mb-2 text-center text-black leading-tight">Welcome back</h1>
        <p className="mb-8 text-xs sm:text-sm font-bold text-center px-4" style={{ color: "var(--text-muted)" }}>CHOOSE YOUR ROLE TO ACCESS YOUR DASHBOARD</p>

        {/* Card */}
        <div className="w-full max-w-md bg-white border-4 border-black shadow-[var(--shadow-lg)] theme-transition flex flex-col">
          {/* Role tabs */}
          <div className="flex flex-wrap sm:flex-nowrap border-b-4 border-black bg-[var(--surface-2)]">
            {(["STUDENT", "TEACHER", "ADMIN"] as const).map((role) => (
              <button
                key={role}
                onClick={() => { setActiveRole(role as Role); resetForm(); }}
                className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase transition-all duration-150 border-b-4 sm:border-b-0 sm:border-r-4 border-black last:border-b-0 sm:last:border-r-0 ${activeRole === role ? "bg-[var(--nb-blue)] text-white shadow-[inset_0px_-2px_0px_0px_#FFD600] sm:shadow-[inset_0px_-4px_0px_0px_#FFD600]" : "text-[var(--text-muted)] hover:text-black hover:bg-black/5"
                  }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="p-6">
            {activeRole === Roles.STUDENT && renderStudentForm()}
            {activeRole === Roles.TEACHER && renderStaffForm()}
            {activeRole === Roles.ADMIN && renderStaffForm()}
          </div>
        </div>

        <p className="mt-6 text-xs" style={{ color: "var(--text-subtle)" }}>
          © {new Date().getFullYear()} IntelliClass
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
