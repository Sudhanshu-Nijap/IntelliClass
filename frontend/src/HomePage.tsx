

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { BASE } from "./services/api";
import { Navbar } from "./components/Navbar";

const socket = io(BASE);



const Button = ({ children, onClick, variant = "primary", className = "", size = "md" }) => {
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };
  const base = `inline-flex items-center justify-center font-black uppercase tracking-wide transition-all duration-150 border-4 border-black ${sizes[size]} shadow-[var(--shadow)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 active:translate-y-2 active:translate-x-2`;
  const variants = {
    primary: "bg-[var(--nb-yellow)] text-black",
    secondary: "bg-white text-black",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const LightBulbIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ChartBarIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const BookOpenIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const UserGroupIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ClassroomIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);


const AcademicCapIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
  </svg>
);

interface AnimatedFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  delay?: number;
}

const AnimatedFeatureCard: React.FC<AnimatedFeatureCardProps> = ({
  icon,
  title,
  children,
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      onClick={() => setIsActive(!isActive)}
      className={`relative transition-all duration-500 group cursor-pointer ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
    >
      <div
        className={`h-full transition-all duration-150 p-6 flex flex-col items-start border-4 border-black ${isActive ? 'translate-y-2 translate-x-2 shadow-none' : 'shadow-[var(--shadow-lg)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[var(--shadow)]'}`}
        style={{
          background: isActive ? 'var(--nb-yellow)' : 'var(--surface)',
        }}
      >
        <div className={`relative z-10 mb-5 p-3 border-4 border-black bg-[var(--nb-pink)] transform transition-all duration-300 ${isActive ? 'rotate-0' : 'rotate-[-6deg]'}`}>
          {React.cloneElement(icon as any, { className: 'w-8 h-8', style: { color: 'white' } })}
        </div>

        <h3 className="relative z-10 text-xl font-black uppercase mb-2 text-black">
          {title}
        </h3>
        <p className="relative z-10 text-sm font-bold text-black opacity-80 leading-relaxed">{children}</p>
        
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </div>
  );
};







const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // On reload/mount, scroll to top and clear the hash to ensure we land on the homepage
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    socket.emit("hi", "Hellooooo");
  }, []);

  return (
    <div className="overflow-hidden theme-transition min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />

      <main className="flex-1">
        {/* Home Section */}
        <section id="home" className="section-full relative overflow-hidden">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 opacity-[0.25] bg-grid"></div>

          <div className="container-custom relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Text Content */}
            <div className="text-center lg:text-left space-y-6 animate-fade-in order-2 lg:order-1">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tighter" style={{ color: 'var(--text)' }}>
                The &nbsp; Future of <br className="hidden sm:block" />
                <span className="text-[var(--nb-blue)] inline-block bg-[var(--nb-yellow)] px-4 py-2 mt-2 border-4 border-black box-decoration-clone">
                  Learning.
                </span>
              </h1>

              <p className="max-w-lg mx-auto lg:ml-0 text-base sm:text-lg lg:text-xl leading-relaxed opacity-90" style={{ color: 'var(--text-muted)' }}>
                Master your subjects with a powerful, AI-driven workspace. Create and analyze quizzes in seconds.
              </p>

              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-4">
                <Button
                  onClick={() => navigate("/login")}
                  size="lg"
                  className="px-8 h-14 text-lg shadow-xl shadow-violet-500/25 hover:shadow-violet-600/35"
                >
                  Get Started Now
                  <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
                <Button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="secondary"
                  size="lg"
                  className="px-8 h-14 text-lg"
                >
                  Explore Features
                </Button>
              </div>
            </div>

            {/* Right Column: Illustration */}
            <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end mb-8 lg:mb-0">
              <div className="relative w-full max-w-[320px] sm:max-w-[420px] xl:max-w-[520px] bg-[var(--nb-green)] border-4 border-black p-4 shadow-[var(--shadow-lg)] transform rotate-3 animate-float hover:rotate-0 transition-transform duration-500">
                <img
                  src="/hero_illustration.png"
                  alt="EdTech Illustration"
                  className="w-full h-auto border-4 border-black bg-white"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section-full py-[var(--section-py)] relative" style={{ background: 'var(--surface)' }}>
          <div className="absolute inset-0 shimmer"></div>
          <div className="container-custom relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase mb-6 text-black border-4 border-black bg-[var(--nb-yellow)] inline-block px-6 py-3 shadow-[var(--shadow)]">
                Why Choose IntelliClass?
              </h2>
              <p className="text-xl max-w-2xl mx-auto font-bold text-black bg-white border-4 border-black p-4 shadow-[var(--shadow-sm)]">
                Experience the next generation of personalized learning with cutting-edge AI technology.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
              <AnimatedFeatureCard delay={100} icon={<LightBulbIcon />} title="Instant Assessments">
                Convert your study materials into structured quizzes in seconds, eliminating manual draft work.
              </AnimatedFeatureCard>
              <AnimatedFeatureCard delay={200} icon={<ChartBarIcon />} title="Smart Analytics">
                Visualize progress with clear performance metrics that highlight exactly where you need to focus.
              </AnimatedFeatureCard>
              <AnimatedFeatureCard delay={300} icon={<ClassroomIcon />} title="Unified Classrooms">
                Collaborate in private digital spaces with simple join codes and streamlined resource sharing.
              </AnimatedFeatureCard>
              <AnimatedFeatureCard delay={400} icon={<BookOpenIcon />} title="Targeted Practice">
                Our engine identifies your weak spots and crafts personalized follow-up challenges to build mastery.
              </AnimatedFeatureCard>
              <AnimatedFeatureCard delay={500} icon={<UserGroupIcon />} title="Integrated Forums">
                Learn alongside your peers in dedicated discussion boards designed for collaborative troubleshooting.
              </AnimatedFeatureCard>
              <AnimatedFeatureCard delay={600} icon={<AcademicCapIcon />} title="Engaging Metrics">
                Boost motivation with real-time class rankings and interactive polls that celebrate milestones.
              </AnimatedFeatureCard>
            </div>
          </div>
        </section>

        {/* How to Use Section */}
        <section id="how-to-use" className="section-full py-[var(--section-py)] relative overflow-hidden" style={{ background: 'var(--surface-3)' }}>
          <div className="container-custom relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase mb-6 inline-block bg-[var(--nb-blue)] text-white border-4 border-black px-6 py-3 shadow-[var(--shadow)]">
                Simple Setup, Powerful Results
              </h2>
              <p className="text-xl max-w-2xl mx-auto font-bold bg-white text-black border-4 border-black p-4 shadow-[var(--shadow-sm)]">
                Get started in minutes with our simple guide for both educators and learners.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-stack-2 gap-8 lg:gap-12">
              {/* Teacher Card */}
              <div className="relative group">
                <div className="relative p-8 sm:p-10 h-full flex flex-col border-4 border-black shadow-[var(--shadow-lg)] transition-all hover:translate-y-1 hover:translate-x-1 hover:shadow-[var(--shadow)]" style={{ background: 'var(--surface)' }}>
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-16 h-16 bg-[var(--nb-green)] flex items-center justify-center border-4 border-black">
                      <AcademicCapIcon className="w-8 h-8 text-black" />
                    </div>
                    <div>
                      <h4 className="text-3xl font-black uppercase text-black">For Teachers</h4>
                      <p className="text-sm font-bold text-black">MANAGE & EDUCATE</p>
                    </div>
                  </div>
                  <ul className="space-y-8 flex-1">
                    {[
                      { num: "01", text: "<b>Launch your Class:</b> Open the dashboard to create your secure digital workspace and get your unique access code instantly." },
                      { num: "02", text: "<b>Upload & Generate:</b> Drag in your study materials. We'll handle the complex work of drafting high-quality questions for you." },
                      { num: "03", text: "<b>Track Results:</b> Monitor student engagement and identify gaps with real-time analytics and detailed performance reports." }
                    ].map((item, i) => (
                      <li key={i} className="flex gap-6 items-start">
                        <span className="shrink-0 text-3xl font-black text-black leading-none px-2 py-1 bg-[var(--nb-yellow)] border-4 border-black">{item.num}</span>
                        <p className="text-black font-bold text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: item.text }} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Student Card */}
              <div className="relative group">
                <div className="relative p-8 sm:p-10 h-full flex flex-col border-4 border-black shadow-[var(--shadow-lg)] transition-all hover:translate-y-1 hover:translate-x-1 hover:shadow-[var(--shadow)]" style={{ background: 'var(--surface)' }}>
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-16 h-16 bg-[var(--nb-pink)] flex items-center justify-center border-4 border-black">
                      <UserGroupIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-3xl font-black uppercase text-black">For Students</h4>
                      <p className="text-sm font-bold text-black">LEARN & MASTER</p>
                    </div>
                  </div>
                  <ul className="space-y-8 flex-1">
                    {[
                      { num: "01", text: "<b>Enter the Portal:</b> Simply type the classroom code provided by your teacher to instantly access your course materials and tools." },
                      { num: "02", text: "<b>Practice Smarter:</b> Work through adaptive quizzes that focus on your weak areas, helping you master difficult concepts faster." },
                      { num: "03", text: "<b>Get AI Help:</b> Stuck on a question? Access the AI tutor for personalized explanations and detailed study notes on the spot." }
                    ].map((item, i) => (
                      <li key={i} className="flex gap-6 items-start">
                        <span className="shrink-0 text-3xl font-black text-black leading-none px-2 py-1 bg-[var(--nb-blue)] border-4 border-black block min-w-[3rem] text-center">{item.num}</span>
                        <p className="text-black font-bold text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: item.text }} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Us Section */}
        <section id="about-us" className="section-full py-[var(--section-py)] relative theme-transition overflow-hidden" style={{ background: 'var(--bg)' }}>
          <div className="container-custom relative z-10 text-center">
            <div className="inline-flex items-center gap-2 mb-8 px-5 py-2 text-black text-xl font-bold border-4 border-black bg-[var(--nb-yellow)] uppercase shadow-[var(--shadow-sm)]">
              OUR VISION
            </div>
            <h2 className="text-5xl sm:text-7xl font-black uppercase mb-10 text-black leading-normal sm:leading-[1.2] py-2">
              Built for <span className="bg-black text-white px-3 py-1 border-4 border-black mx-1 inline-block mb-2 sm:mb-0">Teachers</span>, <br className="sm:hidden" /> by People Who Care
            </h2>
            <div className="space-y-8 text-lg sm:text-xl leading-relaxed max-w-4xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              <p>
                IntelliClass didn't start in a boardroom. It started in the classroom. We saw educators struggling with clunky interfaces and tedious administration, taking away precious time that should have been spent inspiring students.
              </p>
              <p>
                We built this platform to be the tool we always wanted: something that feels natural, works instantly, and actually makes the day easier. No complex setups, no friction—just a clean, powerful space for learning to thrive.
              </p>
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-8 sm:gap-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--nb-pink)] border-4 border-black flex items-center justify-center shadow-[var(--shadow-sm)]"></div>
                <span className="text-xl font-bold uppercase text-black">Simple by Design</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--nb-green)] border-4 border-black flex items-center justify-center shadow-[var(--shadow-sm)]"></div>
                <span className="text-xl font-bold uppercase text-black">Privacy First</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--nb-blue)] border-4 border-black flex items-center justify-center shadow-[var(--shadow-sm)]"></div>
                <span className="text-xl font-bold uppercase text-black">Free for Educators</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-10 theme-transition border-t-8 border-black bg-[var(--surface-2)]">
        <div className="container-custom flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="IntelliClass Logo" className="w-8 h-8 object-contain" />
            <span className="font-black text-xl uppercase tracking-tighter">IntelliClass</span>
          </div>
          <p className="text-black font-bold text-sm">
            &copy; {new Date().getFullYear()} IntelliClass. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-bold uppercase tracking-wide text-black">
            <a href="#" className="hover:bg-[var(--nb-yellow)] px-2 border-2 border-transparent hover:border-black transition-all">Privacy</a>
            <a href="#" className="hover:bg-[var(--nb-yellow)] px-2 border-2 border-transparent hover:border-black transition-all">Terms</a>
            <a href="#" className="hover:bg-[var(--nb-yellow)] px-2 border-2 border-transparent hover:border-black transition-all">Contact</a>
          </div>
        </div>
      </footer>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
