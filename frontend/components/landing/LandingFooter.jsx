import { Link } from "react-router-dom";

function LandingFooter() {
  return (
    <footer className="glass-card rounded-3xl px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-cyan-50/80">AI Resume Mentor - Premium AI career tooling for modern developers.</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/upload" className="text-cyan-100/90 transition hover:text-cyan-50">
            Upload
          </Link>
          <Link to="/chat" className="text-cyan-100/90 transition hover:text-cyan-50">
            Analysis
          </Link>
          <Link to="/mentor" className="text-cyan-100/90 transition hover:text-cyan-50">
            AI Chat
          </Link>
          <Link to="/results" className="text-cyan-100/90 transition hover:text-cyan-50">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
