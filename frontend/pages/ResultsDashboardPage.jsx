import { Link } from "react-router-dom";
import { Download, History, Save } from "lucide-react";

import ATSScoreBar from "../components/ATSScoreBar";
import SkillListCard from "../components/SkillListCard";
import SuggestionsCard from "../components/SuggestionsCard";
import { useResumeMentor } from "../src/context/ResumeMentorContext";

function ResultsDashboardPage() {
  const { state, actions } = useResumeMentor();
  const comparison = state.comparison;
  const breakdown = comparison?.ats_score_breakdown || {};

  function downloadSuggestions() {
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

    const escapedText = lines
      .join("\n")
      .slice(0, 3000)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .split("\n");
    const content = `BT /F1 11 Tf 40 800 Td ${escapedText.map((line) => `(${line}) Tj T*`).join(" ")} ET`;

    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((obj, idx) => {
      offsets.push(pdf.length);
      pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "resume_improvement_suggestions.pdf";
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
        <p className="mb-3 font-display text-lg text-white">ATS Score Breakdown</p>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: "Exact Match Score", value: Number(breakdown.exact_match_score || 0), positive: true },
            { label: "Related Match Score", value: Number(breakdown.related_match_score || 0), positive: true },
            { label: "Gap Penalty", value: Number(breakdown.gap_penalty || 0), positive: false },
            { label: "Breadth Bonus", value: Number(breakdown.breadth_bonus || 0), positive: true }
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-100/75">{item.label}</p>
                <p className="text-sm font-semibold text-cyan-50">{item.value.toFixed(2)}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cyan-100/10">
                <div
                  className={`h-full rounded-full ${item.positive ? "bg-gradient-to-r from-cyan-400 to-teal-300" : "bg-gradient-to-r from-rose-400 to-orange-300"}`}
                  style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                />
              </div>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-cyan-100/70">
          Weighted coverage: {Number(breakdown.matched_required_weight || 0).toFixed(2)} / {Number(breakdown.total_required_weight || 0).toFixed(2)}
        </p>
      </section>

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

      <section className="glass-card rounded-3xl p-5">
        <p className="mb-3 font-display text-lg text-white">Resume Versions</p>
        <div className="grid gap-2">
          {state.resumeVersions.length ? (
            state.resumeVersions.map((item) => (
              <article key={item.id} className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 p-3">
                <p className="text-sm font-semibold text-cyan-50">{item.label}</p>
                <p className="text-xs text-cyan-100/70">
                  {new Date(item.timestamp).toLocaleString()} - {(item.improvement?.improved_bullets || []).length} upgraded bullets
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-cyan-100/75">No improved versions yet. Use the Improve Resume button in Gemini Chat.</p>
          )}
        </div>
      </section>
    </section>
  );
}

export default ResultsDashboardPage;
