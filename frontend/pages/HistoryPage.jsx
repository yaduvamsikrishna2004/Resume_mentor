import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useResumeMentor } from "../src/context/ResumeMentorContext";

function HistoryPage() {
  const { state, actions } = useResumeMentor();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("latest");

  const filteredResults = useMemo(() => {
    const base = [...(state.savedResults || [])].filter((entry) => {
      const hasUsefulChanges =
        Number(entry?.comparison?.ats_score || 0) > 0 ||
        (entry?.comparison?.missing_skills || []).length > 0 ||
        (entry?.suggestions || []).length > 0;
      if (!hasUsefulChanges) {
        return false;
      }
      const haystack = `${new Date(entry.timestamp).toLocaleString()} ${entry.comparison?.ats_score || 0}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });

    if (sortMode === "highest") {
      base.sort((a, b) => Number(b?.comparison?.ats_score || 0) - Number(a?.comparison?.ats_score || 0));
    } else {
      base.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return base;
  }, [query, sortMode, state.savedResults]);

  function openAnalysis(entryId) {
    actions.loadSavedResult(entryId);
    navigate("/results");
  }

  return (
    <section className="space-y-5">
      <section className="glass-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl text-white">Saved Analyses</p>
            <p className="text-sm text-cyan-100/80">Search, sort, and reopen past ATS analyses.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSortMode("latest")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                sortMode === "latest" ? "bg-accent text-surface" : "bg-cyan-100/10 text-cyan-50 hover:bg-cyan-100/20"
              }`}
            >
              Latest
            </button>
            <button
              type="button"
              onClick={() => setSortMode("highest")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                sortMode === "highest" ? "bg-accent text-surface" : "bg-cyan-100/10 text-cyan-50 hover:bg-cyan-100/20"
              }`}
            >
              Highest ATS
            </button>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-cyan-100/20 bg-cyan-100/5 px-3 py-2">
          <Search size={14} className="text-cyan-100/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by date/time or ATS score..."
            className="w-full bg-transparent text-sm text-cyan-50 outline-none placeholder:text-cyan-100/50"
          />
        </label>
      </section>

      <section className="grid gap-3">
        {filteredResults.length ? (
          filteredResults.map((entry) => (
            <article
              key={entry.id}
              className="glass-card rounded-2xl border border-cyan-100/20 p-4 transition hover:-translate-y-[1px] hover:shadow-[0_0_24px_rgba(90,239,255,0.22)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-cyan-50">{entry.label || "Saved Analysis"}</p>
                <span className="rounded-full bg-cyan-100/10 px-2.5 py-1 text-xs text-cyan-100">
                  ATS {Number(entry?.comparison?.ats_score || 0).toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-cyan-100/70">{new Date(entry.timestamp).toLocaleString()}</p>
              <p className="mt-1 text-xs text-cyan-100/70">
                Resume Version: {entry.resume_version || state.resumeVersions[0]?.label || "N/A"}
              </p>
              <p className="mt-3 text-sm text-cyan-50/90">
                {entry.summary ||
                  `Top gaps: ${(entry?.comparison?.missing_skills || []).slice(0, 2).join(", ") || "Not available"}`}
              </p>
              <button
                type="button"
                onClick={() => openAnalysis(entry.id)}
                className="mt-3 rounded-xl bg-cyan-100/15 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
              >
                Open Full Analysis
              </button>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 px-4 py-3 text-sm text-cyan-100/80">
            No saved analyses found for the current filter.
          </p>
        )}
      </section>
    </section>
  );
}

export default HistoryPage;
