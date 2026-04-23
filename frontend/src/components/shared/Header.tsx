import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Roles } from '../../types';
import { Button } from '../ui';
import { TrophyIcon } from '../Icons';

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

export const Header = () => {
    const { currentUser, logout } = useAppContext();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const homePath = currentUser ? `/${currentUser.role.toLowerCase()}` : '/';

    return (
        <header
            className="sticky top-0 z-40 transition-all duration-300"
            style={{
                background: isDark ? '#121212' : '#ffffff',
                borderBottom: `4px solid ${isDark ? '#ffffff' : '#000000'}`,
            }}
        >
            <div className="max-w-7xl mx-auto px-2 sm:px-6 py-3 min-h-[4rem] flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-3 gap-x-2 sm:gap-x-4">
                <div className="flex items-center justify-between w-full lg:w-auto lg:basis-0 lg:flex-1 shrink-0 gap-2">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-2.5 cursor-pointer shrink-0"
                        onClick={() => navigate(homePath)}
                    >
                        <img src="/favicon.png" alt="IntelliClass Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
                        <span
                            className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black"
                            style={{ textShadow: "-2px -2px 0 var(--nb-yellow), 2px 2px 0 var(--nb-blue)" }}
                        >
                            IntelliClass
                        </span>
                    </div>

                    {/* Right side (Mobile) */}
                    <div className="flex items-center gap-2 shrink-0 lg:hidden">
                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 rounded-none flex items-center justify-center transition-all bg-[var(--surface-2)] border-2 border-[var(--border)] shadow-[var(--shadow-sm)]"
                            aria-label="Toggle theme"
                        >
                            {isDark ? <SunIcon /> : <MoonIcon />}
                        </button>
                        {currentUser && (
                            <Button onClick={logout} variant="secondary" className="text-xs px-2 py-1 h-8">
                                Logout
                            </Button>
                        )}
                    </div>
                </div>

                {/* Nav links */}
                {currentUser && (
                    <nav className="flex flex-wrap items-center justify-center lg:justify-center gap-x-3 gap-y-2 w-full lg:basis-0 lg:flex-1 lg:min-w-0 pb-2 lg:pb-0">
                        {[
                            { to: '/leaderboard', label: 'Leaderboard' },
                            ...(currentUser.role === Roles.STUDENT ? [{ to: '/discussions', label: 'Discussions' }] : []),
                            ...(currentUser.role !== Roles.ADMIN ? [{ to: '/classrooms', label: 'Classrooms' }] : []),
                            ...(currentUser.role === Roles.STUDENT ? [
                                { to: '/learning', label: 'Learning' },
                                { to: '/resources', label: 'Resources' },
                            ] : []),
                        ].map(({ to, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className="px-2 py-1 text-xs sm:text-sm font-bold uppercase transition-all duration-150 border-2 border-transparent hover:border-black whitespace-nowrap bg-[var(--surface-2)] sm:bg-transparent"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                                    (e.currentTarget as HTMLElement).style.background = 'var(--nb-yellow)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                                    (e.currentTarget as HTMLElement).style.background = window.innerWidth < 640 ? 'var(--surface-2)' : 'transparent';
                                }}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                )}

                {/* Right side (Desktop) */}
                <div className="hidden lg:flex items-center justify-end gap-2 lg:basis-0 lg:flex-1 shrink-0">
                    {/* Points */}
                    {currentUser?.role === Roles.STUDENT && (
                        <div className="flex items-center gap-1 font-bold text-yellow-500 text-sm px-2 py-1 rounded-lg"
                            style={{ background: 'var(--surface-2)' }}>
                            <TrophyIcon className="w-4 h-4" />
                            <span>{currentUser.points}</span>
                        </div>
                    )}

                    {/* User name */}
                    {currentUser && (
                        <Link
                            to={`/${currentUser.role.toLowerCase()}/${currentUser._id || currentUser.id}`}
                            className="inline text-sm font-black px-3 py-1.5 transition-all border-2 border-transparent hover:border-black"
                            style={{ color: 'var(--text)', background: 'var(--nb-yellow)' }}
                        >
                            {currentUser.name}
                            <span className="ml-1 opacity-60 text-xs">({currentUser.role})</span>
                        </Link>
                    )}

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-none flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-[var(--text)] bg-[var(--surface-2)] border-2 border-[var(--border)] shadow-[var(--shadow-sm)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none"
                        aria-label="Toggle theme"
                    >
                        {isDark ? <SunIcon /> : <MoonIcon />}
                    </button>

                    {/* Logout */}
                    {currentUser && (
                        <Button onClick={logout} variant="secondary" className="text-sm px-3 py-1.5 h-9">
                            Logout
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};
