import { Link } from "react-router-dom";

import ATSScoreBar from "../components/ATSScoreBar";
import SkillListCard from "../components/SkillListCard";
import SuggestionsCard from "../components/SuggestionsCard";
import { useResumeMentor } from "../src/context/ResumeMentorContext";

function ResultsDashboardPage() {
  const { state } = useResumeMentor();
  const comparison = state.comparison;

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

      <div className="grid gap-4 lg:grid-cols-3">
        <SkillListCard title="Resume Skills" skills={comparison.resume_skills} color="cyan" />
        <SkillListCard title="Matching Skills" skills={comparison.matching_skills} color="green" />
        <SkillListCard title="Missing Skills" skills={comparison.missing_skills} color="red" />
      </div>

      <SuggestionsCard suggestions={state.suggestions} />

      <Link
        to="/mentor"
        className="inline-flex rounded-2xl bg-cyan-100/15 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
      >
        Ask Gemini About Improvements
      </Link>
    </section>
  );
}

export default ResultsDashboardPage;
