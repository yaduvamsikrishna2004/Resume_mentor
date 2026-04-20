import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

import { improveResume, streamMentorChat } from "../src/api/client";
import { useResumeMentor } from "../src/context/ResumeMentorContext";

function MentorChatPage() {
  const { state, actions } = useResumeMentor();
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState("");
  const [serviceNotice, setServiceNotice] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState("");
  const chatWindowRef = useRef(null);

  useEffect(() => {
    const node = chatWindowRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [state.mentorChatHistory, isLoading]);

  const mentorContext = useMemo(
    () => ({
      resume_filename: state.filename || "",
      extracted_skills: state.analysis?.skills || [],
      resume_preview: state.rawTextPreview || "",
      ats_score: state.comparison?.ats_score ?? null,
      missing_skills: state.comparison?.missing_skills || [],
      matching_skills: state.comparison?.matching_skills || [],
      suggestions: state.suggestions || [],
      job_description: state.lastJobDescription || ""
    }),
    [
      state.analysis?.skills,
      state.comparison,
      state.filename,
      state.lastJobDescription,
      state.rawTextPreview,
      state.suggestions
    ]
  );

  async function sendMentorMessage(message, formElement = null) {
    if (!message) {
      setError("Please enter a question for the mentor.");
      return;
    }

    setError("");
    setServiceNotice("");
    setThinkingMessage("Analyzing your resume...");
    setIsLoading(true);
    actions.pushMentorMessage({ role: "user", content: message });
    actions.pushMentorMessage({ role: "assistant", content: "" });
    const effectiveHistory = [...state.mentorChatHistory, { role: "user", content: message }].slice(-10);

    try {
      await streamMentorChat(
        {
          message,
          resumeId: state.resumeId || undefined,
          resumeText: state.rawResumeText || state.rawTextPreview || "",
          jobDescription: state.lastJobDescription || "",
          chatHistory: effectiveHistory,
          resumeContext: mentorContext
        },
        {
          retries: 1,
          onMeta: (meta) => {
            if (meta?.message) {
              setThinkingMessage(meta.message);
            }
          },
          onChunk: (chunk) => {
            actions.appendToLastMentorMessage(chunk);
          },
          onDone: (meta) => {
            const latencyMs = Number(meta?.latency_ms || meta?.stream_latency_ms || 0);
            if (meta?.source === "fallback") {
              setServiceNotice("Gemini is currently degraded. You received fallback guidance.");
            } else if (latencyMs > 9000) {
              setServiceNotice(`AI response took ${(latencyMs / 1000).toFixed(1)}s due to temporary service load.`);
            }
            setThinkingMessage("");
          }
        }
      );
      if (formElement) {
        formElement.reset();
      }
    } catch (chatError) {
      setError(chatError.message || "AI is temporarily unavailable. Please try again.");
      setThinkingMessage("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMentorChat(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const message = String(formData.get("mentorQuestion") || "").trim();
    await sendMentorMessage(message, formElement);
  }

  async function handleExplainAtsScore() {
    if (!state.comparison?.ats_score) {
      setError("Run skill-gap analysis first to explain ATS score.");
      return;
    }
    setError("");
    const atsPrompt = `Explain my ATS score of ${state.comparison.ats_score}% and list the top 3 fixes.`;
    await sendMentorMessage(atsPrompt);
  }

  async function handleImproveResume() {
    setError("");
    setIsImproving(true);
    try {
      const response = await improveResume({
        resumeId: state.resumeId || undefined,
        resumeText: state.rawResumeText || state.rawTextPreview || "",
        jobDescription: state.lastJobDescription || "",
        focusAreas: ["impact", "clarity", "ats_keywords"]
      });
      actions.addResumeVersion({
        label: `Version ${state.resumeVersions.length + 1}`,
        improvement: response.data.improvement,
        meta: response.data.meta
      });
      actions.pushMentorMessage({
        role: "assistant",
        content: `Created a new resume version with ${response.data.improvement?.improved_bullets?.length || 0} improved bullets.`
      });
    } catch (improveError) {
      setError(improveError.message || "Failed to improve resume.");
    } finally {
      setIsImproving(false);
    }
  }

  return (
    <section className="space-y-4">
      <section className="glass-card rounded-3xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg text-white">Realtime AI Resume Chat</p>
            <p className="text-sm text-cyan-100/80">
              Context-aware mentor responses using resume content, ATS score, and job description.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => actions.saveMentorChatSession(`Session ${new Date().toLocaleTimeString()}`)}
              className="rounded-2xl bg-cyan-100/15 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
            >
              <span className="inline-flex items-center gap-1">
                <Bookmark size={14} />
                Save Chat
              </span>
            </button>
            <button
              type="button"
              onClick={actions.resetMentorChat}
              className="rounded-2xl bg-cyan-100/15 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
            >
              Clear Chat
            </button>
          </div>
        </div>

        <div ref={chatWindowRef} className="max-h-[520px] overflow-y-auto pr-1">
          <div className="flex flex-col gap-3">
            {state.mentorChatHistory.map((message, index) => {
              const isAssistant = message.role === "assistant";
              const isLatest = index === state.mentorChatHistory.length - 1;
              return (
                <motion.div
                  key={`${message.role}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-3xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm sm:text-base ${
                    isAssistant
                      ? "self-start bg-cyan-100/15 text-cyan-50"
                      : "self-end bg-accent text-surface font-semibold"
                  }`}
                >
                  {message.content || (
                    <span className="inline-flex items-center gap-2 text-cyan-100/80">
                      {thinkingMessage || "Thinking"}
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-100 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-100 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-100" />
                      </span>
                    </span>
                  )}
                  {isAssistant && isLatest && isLoading && message.content ? (
                    <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-cyan-100 align-middle" />
                  ) : null}
                </motion.div>
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
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-accent px-4 py-3 font-semibold text-surface transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Mentor is typing..." : "Send Message"}
            </button>
            <button
              type="button"
              disabled={isImproving}
              onClick={handleImproveResume}
              className="w-full rounded-2xl bg-cyan-100/15 px-4 py-3 font-semibold text-cyan-50 transition hover:bg-cyan-100/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isImproving ? "Improving..." : "Improve Resume"}
            </button>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleExplainAtsScore}
            className="w-full rounded-2xl border border-cyan-100/25 bg-cyan-100/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-100/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Explain ATS Score
          </button>
        </form>
      </section>

      {state.savedMentorChats.length ? (
        <section className="glass-card rounded-3xl p-4 sm:p-5">
          <p className="mb-3 font-display text-base text-white">Saved Chat Sessions</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {state.savedMentorChats.slice(0, 6).map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => actions.loadMentorChatSession(session.id)}
                className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 px-3 py-2 text-left text-xs text-cyan-100 transition hover:bg-cyan-100/10"
              >
                <p className="font-semibold text-cyan-50">{session.label}</p>
                <p>{new Date(session.timestamp).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

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
