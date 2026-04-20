import { Link } from "react-router-dom";
import { Download, History, Save } from "lucide-react";

import ATSScoreBar from "../components/ATSScoreBar";
import SkillListCard from "../components/SkillListCard";
import SuggestionsCard from "../components/SuggestionsCard";
import { useResumeMentor } from "../src/context/ResumeMentorContext";

function ResultsDashboardPage() {
  const { state, actions } = useResumeMentor();
  const comparison = state.comparison;

  function downloadSuggestions() {
    // Export a recruiter-friendly text bundle for quick offline review.
    const lines = [
      "AI Resume Mentor - Improved Resume Suggestions",
      "",
      `ATS Score: ${comparison?.ats_score ?? 0}%`,
      "",
      "Missing Skills:",
      ...(comparison?.missing_skills || []).map((skill) => `- ${skill}`),
      "",
      "Recommendations:",
      ...(state.suggestions || []).flatMap((item) => [
        `- ${item.skill}`,
        `  Learning: ${item.learning_suggestion}`,
        `  Project: ${item.project_suggestion}`,
        ""
      ])
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "resume_improvement_suggestions.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!comparison) {
    return (
      <section className="glass-card rounded-3xl p-6">
        <p className="font-display text-xl text-white">No analysis results yet</p>
        <p className="mt-2 text-cyan-100/90">Run skill-gap analysis from the chat page to populate your dashboard.</p>
        <Link
          to="/chat"
          className="mt-5 inline-flex rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface"
        >
          Open Skill Gap Analysis
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <ATSScoreBar score={comparison.ats_score || 0} />

      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
        <button
          type="button"
          onClick={() => actions.saveCurrentResult("Manual save")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-100/15 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
        >
          <Save size={16} />
          Save Result
        </button>
        <button
          type="button"
          onClick={downloadSuggestions}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface transition hover:brightness-105"
        >
          <Download size={16} />
          Download Improved Resume Suggestions
        </button>
        <Link
          to="/mentor"
          className="inline-flex items-center justify-center rounded-2xl bg-cyan-100/15 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
        >
          Ask Gemini About Improvements
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SkillListCard title="Resume Skills" skills={comparison.resume_skills} color="cyan" />
        <SkillListCard title="Matching Skills" skills={comparison.matching_skills} color="green" />
        <SkillListCard title="Missing Skills" skills={comparison.missing_skills} color="red" />
      </div>

      <SuggestionsCard suggestions={state.suggestions} />

      <section className="glass-card rounded-3xl p-5">
        <p className="mb-3 inline-flex items-center gap-2 font-display text-lg text-white">
          <History size={18} />
          Recent Saved Results
        </p>
        <div className="grid gap-2">
          {state.savedResults.length ? (
            state.savedResults.map((item) => (
              <article key={item.id} className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 p-3">
                <p className="text-sm font-semibold text-cyan-50">{item.label}</p>
                <p className="text-xs text-cyan-100/70">
                  {new Date(item.timestamp).toLocaleString()} - ATS {item.comparison?.ats_score ?? 0}%
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-cyan-100/75">No saved results yet.</p>
          )}
        </div>
      </section>
    </section>
  );
}

export default ResultsDashboardPage;
