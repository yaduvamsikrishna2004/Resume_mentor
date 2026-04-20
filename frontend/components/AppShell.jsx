import { Link, useLocation } from "react-router-dom";
import { MoonStar, Sun } from "lucide-react";

import { useResumeMentor } from "../src/context/ResumeMentorContext";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/upload", label: "Upload Resume" },
  { to: "/chat", label: "Skill Gap Analysis" },
  { to: "/mentor", label: "Gemini Chat" },
  { to: "/results", label: "Results Dashboard" }
];

function AppShell({ children }) {
  const { pathname } = useLocation();
  const { state, actions } = useResumeMentor();
  const isLight = state.themeMode === "light";

  return (
    <div className="min-h-screen text-neutral">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <header className="glass-card rounded-3xl px-5 py-4 shadow-glow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-xl text-white">AI Resume Mentor</p>
              <p className="text-sm text-cyan-100/90">
                Analyze resumes, compare job fit, and close skill gaps with targeted guidance.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={actions.toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-200/10 text-cyan-100 transition hover:bg-cyan-200/20"
                aria-label="Toggle theme"
              >
                {isLight ? <MoonStar size={18} /> : <Sun size={18} />}
              </button>
              <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      active
                        ? "bg-accent text-surface font-semibold"
                        : "bg-cyan-200/10 text-cyan-100 hover:bg-cyan-200/20"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              </nav>
            </div>
          </div>
        </header>
        <main className="pb-8">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
