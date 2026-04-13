import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { mentorChat } from "../src/api/client";
import { useResumeMentor } from "../src/context/ResumeMentorContext";

function MentorChatPage() {
  const { state, actions } = useResumeMentor();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [serviceNotice, setServiceNotice] = useState("");

  const mentorContext = useMemo(
    () => ({
      ats_score: state.comparison?.ats_score ?? null,
      missing_skills: state.comparison?.missing_skills || [],
      matching_skills: state.comparison?.matching_skills || [],
      suggestions: state.suggestions || []
    }),
    [state.comparison, state.suggestions]
  );

  async function handleMentorChat(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const message = String(formData.get("mentorQuestion") || "").trim();

    if (!message) {
      setError("Please enter a message for Gemini mentor.");
      return;
    }

    setError("");
    setServiceNotice("");
    setIsLoading(true);
    actions.pushMentorMessage({ role: "user", content: message });

    try {
      const response = await mentorChat({
        message,
        resumeId: state.resumeId || undefined,
        chatHistory: state.mentorChatHistory.slice(-10),
        extraContext: mentorContext
      });

      actions.pushMentorMessage({
        role: "assistant",
        content: response.data.reply || "I couldn't generate a response right now."
      });

      const meta = response?.data?.meta || {};
      const latencyMs = Number(meta.latency_ms || 0);
      if (meta.source === "fallback") {
        setServiceNotice("Gemini is temporarily degraded. You received deterministic fallback guidance.");
      } else if (meta.source === "gemini_fallback_model") {
        setServiceNotice("Primary Gemini model was slow/unavailable; fallback model handled this reply.");
      } else if (latencyMs > 7000) {
        setServiceNotice(`Gemini responded in ${(latencyMs / 1000).toFixed(1)}s due to temporary service load.`);
      }

      formElement.reset();
    } catch (chatError) {
      setError(chatError.message || "Failed to get mentor response.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <section className="glass-card rounded-3xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg text-white">Gemini Resume Chatbot</p>
            <p className="text-sm text-cyan-100/80">
              Ask personalized questions like how to improve bullets, projects, ATS score, and interview answers.
            </p>
          </div>
          <button
            type="button"
            onClick={actions.resetMentorChat}
            className="rounded-2xl bg-cyan-100/15 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
          >
            Clear Chat
          </button>
        </div>

        <div className="max-h-[520px] overflow-y-auto pr-1">
          <div className="flex flex-col gap-3">
            {state.mentorChatHistory.map((message, index) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-3xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm sm:text-base ${
                    isAssistant
                      ? "self-start bg-cyan-100/15 text-cyan-50"
                      : "self-end bg-accent text-surface font-semibold"
                  }`}
                >
                  {message.content}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleMentorChat} className="mt-5 flex flex-col gap-3">
          <label htmlFor="mentorQuestion" className="font-display text-sm uppercase tracking-wide text-cyan-100">
            Your Question
          </label>
          <textarea
            id="mentorQuestion"
            name="mentorQuestion"
            rows={4}
            required
            placeholder="Example: Rewrite my Python project bullet to show stronger impact for backend internships."
            className="w-full rounded-2xl border border-cyan-100/20 bg-slate-900/70 px-4 py-3 text-cyan-50 outline-none transition focus:border-accent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-accent px-4 py-3 font-semibold text-surface transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Gemini is thinking..." : "Send Message"}
          </button>
        </form>
      </section>

      {!state.resumeId ? (
        <p className="rounded-2xl border border-amber-200/30 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
          Upload your resume for more personalized coaching.
          <Link to="/upload" className="ml-2 font-semibold underline underline-offset-2">
            Upload now
          </Link>
        </p>
      ) : null}

      {serviceNotice ? (
        <p className="rounded-2xl border border-cyan-200/30 bg-cyan-200/10 px-4 py-3 text-sm text-cyan-100">
          {serviceNotice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-rose-200/30 bg-rose-200/10 px-4 py-3 text-sm text-rose-100">{error}</p>
      ) : null}
    </section>
  );
}

export default MentorChatPage;
