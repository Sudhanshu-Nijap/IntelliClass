import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui";

const SunIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
);
const MoonIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
);

const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const XIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const Navbar = () => {
    const { isDark, toggleTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const isHomePage = location.pathname === "/" || location.pathname === "/index.html" || location.pathname === "/login";

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);

        // Handle hash scroll on load
        if (window.location.hash) {
            const id = window.location.hash.substring(2).split('#')[1];
            if (id) {
                setTimeout(() => {
                    const el = document.getElementById(id);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        setIsMenuOpen(false);
        if (window.location.pathname !== '/' && window.location.pathname !== '/#/') {
            navigate('/#' + id);
            return;
        }
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            window.history.pushState(null, '', `/#/#${id}`);
        } else {
            navigate('/#' + id);
        }
    };

    const navLinks = [
        { name: "Home", path: "#home" },
        { name: "Features", path: "#features" },
        { name: "How to Use", path: "#how-to-use" },
        { name: "About Us", path: "#about-us" },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                ? "bg-[var(--surface)] border-b-4 border-[var(--border)] py-2"
                : "bg-[var(--surface)] border-b-4 border-[var(--border)] py-4"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group shrink-0">
                        <img src="/favicon.png" alt="IntelliClass Logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                        <span 
                            className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black hidden xs:block"
                            style={{ textShadow: "-2px -2px 0 var(--nb-yellow), 2px 2px 0 var(--nb-blue)" }}
                        >
                            IntelliClass
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {isHomePage && navLinks.map((link) => (
                            <button
                                key={link.name}
                                onClick={() => scrollToSection(link.path.split('#')[1] || "home")}
                                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                            >
                                {link.name}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-none flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-[var(--text)] bg-[var(--nb-yellow)] border-4 border-[var(--border)] shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-y-1 hover:translate-x-1"
                        >
                            {isDark ? <SunIcon /> : <MoonIcon />}
                        </button>
                        <Button
                            onClick={() => navigate("/login")}
                            variant="secondary"
                            className="hidden xs:flex px-4 py-2 text-sm"
                        >
                            Sign In
                        </Button>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden w-10 h-10 flex items-center justify-center text-[var(--text)] bg-[var(--surface-2)] border-2 border-[var(--border)] shadow-[var(--shadow-sm)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none"
                        >
                            {isMenuOpen ? <XIcon /> : <MenuIcon />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div
                className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                    } bg-[var(--surface)] border-b-4 border-[var(--border)]`}
            >
                <div className="px-4 pt-2 pb-6 space-y-2">
                    {isHomePage && navLinks.map((link) => (
                        <button
                            key={link.name}
                            onClick={() => scrollToSection(link.path.split('#')[1] || "home")}
                            className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-all"
                        >
                            {link.name}
                        </button>
                    ))}
                    <div className="pt-4 flex flex-col gap-2 xs:hidden">
                        <Button
                            onClick={() => {
                                setIsMenuOpen(false);
                                navigate("/login");
                            }}
                            className="w-full"
                        >
                            Sign In
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
