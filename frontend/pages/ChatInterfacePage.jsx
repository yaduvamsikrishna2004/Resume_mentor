import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ChatPanel from "../components/ChatPanel";
import { analyzeResume, compareJob, getSuggestions } from "../src/api/client";
import { useResumeMentor } from "../src/context/ResumeMentorContext";

function ChatInterfacePage() {
  const navigate = useNavigate();
  const { state, actions } = useResumeMentor();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const jobDescription = String(formData.get("jobDescription") || "").trim();

    if (!state.resumeId) {
      setError("Please upload a resume first.");
      return;
    }
    if (!jobDescription) {
      setError("Please provide a job description.");
      return;
    }

    setError("");
    setIsAnalyzing(true);
    actions.pushAnalysisMessage({ role: "user", content: jobDescription });

    try {
      const [analysisResponse, compareResponse] = await Promise.all([
        analyzeResume(state.resumeId),
        compareJob({ resumeId: state.resumeId, jobDescription })
      ]);

      actions.setAnalysis(analysisResponse.data.analysis);
      actions.setComparison(compareResponse.data);

      const suggestionResponse = await getSuggestions(compareResponse.data.missing_skills || [], {
        job_description: jobDescription,
        resume_id: state.resumeId,
        ats_score: compareResponse.data.ats_score,
        matching_skills: compareResponse.data.matching_skills || [],
        resume_skills: compareResponse.data.resume_skills || []
      });
      actions.setSuggestions(suggestionResponse.data.suggestions || []);

      actions.pushAnalysisMessage({
        role: "assistant",
        content: `I found ${compareResponse.data.matching_skills.length} matching skills and ${compareResponse.data.missing_skills.length} missing skills. ATS score: ${compareResponse.data.ats_score}%.`
      });

      formElement.reset();
    } catch (analysisError) {
      setError(analysisError.message || "Failed to analyze job fit.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!state.resumeId) {
    return (
      <section className="glass-card rounded-3xl p-6">
        <p className="font-display text-xl text-white">Resume not uploaded yet</p>
        <p className="mt-2 text-cyan-100/90">Upload a resume to run skill-gap analysis.</p>
        <Link
          to="/upload"
          className="mt-5 inline-flex rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface"
        >
          Go to Upload Page
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <ChatPanel
        messages={state.analysisHistory}
        onAnalyzeSubmit={handleAnalyze}
        isAnalyzeLoading={isAnalyzing}
      />

      {error ? (
        <p className="rounded-2xl border border-rose-200/30 bg-rose-200/10 px-4 py-3 text-sm text-rose-100">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate("/results")}
          className="rounded-2xl bg-cyan-100/15 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
        >
          View Results Dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate("/mentor")}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface transition hover:brightness-105"
        >
          Open Gemini Chatbot
        </button>
      </div>
    </section>
  );
}

export default ChatInterfacePage;
