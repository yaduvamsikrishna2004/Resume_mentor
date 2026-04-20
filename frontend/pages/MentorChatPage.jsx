import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Bot, Copy, RotateCcw, SendHorizontal, User, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";

import { improveResume, streamMentorChat } from "../src/api/client";
import { useResumeMentor } from "../src/context/ResumeMentorContext";

function MentorChatPage() {
  const { state, actions } = useResumeMentor();
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [serviceNotice, setServiceNotice] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState("Analyzing resume...");
  const chatWindowRef = useRef(null);
  const streamQueueRef = useRef([]);
  const streamTimerRef = useRef(null);
  const streamActiveRef = useRef(false);
  const thinkingTimerRef = useRef(null);

  const atsImpact = useMemo(() => {
    const missingCount = Number(state.comparison?.missing_skills?.length || 0);
    return Math.max(6, Math.min(22, missingCount * 3));
  }, [state.comparison?.missing_skills]);

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

  useEffect(() => {
    const node = chatWindowRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [state.mentorChatHistory, isLoading]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
      }
    };
  }, []);

  function startThinkingCycle() {
    const phases = ["Analyzing resume...", "Matching skills with job description..."];
    let index = 0;
    setThinkingMessage(phases[0]);
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
    }
    thinkingTimerRef.current = setInterval(() => {
      index = (index + 1) % phases.length;
      setThinkingMessage(phases[index]);
    }, 1250);
  }

  function stopThinkingCycle() {
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }

  function enqueueChunkWordByWord(chunk) {
    const tokens = String(chunk || "").split(/(\s+)/).filter((token) => token.length);
    streamQueueRef.current.push(...tokens);
    if (streamTimerRef.current) {
      return;
    }
    streamTimerRef.current = setInterval(() => {
      if (!streamQueueRef.current.length) {
        if (!streamActiveRef.current) {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        return;
      }
      const token = streamQueueRef.current.shift();
      actions.appendToLastMentorMessage(token);
    }, 28);
  }

  function findPreviousUserMessage(index) {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const item = state.mentorChatHistory[cursor];
      if (item?.role === "user" && item?.content) {
        return item.content;
      }
    }
    return "";
  }

  async function sendMentorMessage(message, options = {}) {
    const { showUser = true } = options;
    const cleanedMessage = String(message || "").trim();
    if (!cleanedMessage) {
      setError("Ask a question to start the conversation.");
      return;
    }

    setError("");
    setServiceNotice("");
    setIsLoading(true);
    streamActiveRef.current = true;
    streamQueueRef.current = [];
    startThinkingCycle();

    if (showUser) {
      actions.pushMentorMessage({ role: "user", content: cleanedMessage });
    }
    actions.pushMentorMessage({ role: "assistant", content: "" });

    const effectiveHistory = [
      ...state.mentorChatHistory,
      ...(showUser ? [{ role: "user", content: cleanedMessage }] : []),
    ].slice(-10);

    try {
      await streamMentorChat(
        {
          message: cleanedMessage,
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
          onChunk: (chunk) => enqueueChunkWordByWord(chunk),
          onDone: (meta) => {
            const latencyMs = Number(meta?.latency_ms || meta?.stream_latency_ms || 0);
            if (meta?.source === "fallback") {
              setServiceNotice("AI is temporarily unavailable. Fallback guidance was provided.");
            } else if (latencyMs > 9000) {
              setServiceNotice(`Response took ${(latencyMs / 1000).toFixed(1)}s due to temporary load.`);
            }
          }
        }
      );
    } catch (chatError) {
      setError(chatError.message || "AI is temporarily unavailable. Please retry.");
    } finally {
      streamActiveRef.current = false;
      setIsLoading(false);
      stopThinkingCycle();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = draft.trim();
    setDraft("");
    await sendMentorMessage(message, { showUser: true });
  }

  async function handleRegenerate(index) {
    const previousUserMessage = findPreviousUserMessage(index);
    if (!previousUserMessage) {
      setError("Could not find the related user message to regenerate.");
      return;
    }
    await sendMentorMessage(`${previousUserMessage}\n\nRegenerate the answer with stronger depth and specificity.`, { showUser: false });
  }

  async function handleImproveAnswer(index) {
    const previousUserMessage = findPreviousUserMessage(index);
    const assistantMessage = state.mentorChatHistory[index]?.content || "";
    if (!previousUserMessage || !assistantMessage) {
      setError("Could not improve this answer.");
      return;
    }
    await sendMentorMessage(
      `Improve this previous answer with better structure, stronger ATS guidance, and clearer bullet rewrites.\n\nUser: ${previousUserMessage}\n\nCurrent Answer:\n${assistantMessage}`,
      { showUser: false }
    );
  }

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text || "");
      setServiceNotice("Copied to clipboard.");
    } catch {
      setError("Unable to copy this message.");
    }
  }

  async function handleExplainAtsScore() {
    if (!state.comparison?.ats_score) {
      setError("Run skill-gap analysis first to explain ATS score.");
      return;
    }
    await sendMentorMessage(`Explain my ATS score of ${state.comparison.ats_score}% and list top 3 fixes.`, { showUser: true });
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
      await sendMentorMessage("I generated improved resume bullets. Please summarize the strongest 3 upgrades for recruiters.", { showUser: false });
    } catch (improveError) {
      setError(improveError.message || "Failed to improve resume.");
    } finally {
      setIsImproving(false);
    }
  }

  return (
    <section className="glass-card-strong relative flex min-h-[calc(100vh-8.5rem)] flex-col overflow-hidden rounded-3xl">
      <header className="border-b border-cyan-100/20 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg text-white">AI Resume Agent</p>
            <p className="text-sm text-cyan-100/80">Conversational, context-aware mentoring with live streaming responses.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => actions.saveMentorChatSession(`Session ${new Date().toLocaleTimeString()}`)}
              className="rounded-full bg-cyan-100/15 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
            >
              <span className="inline-flex items-center gap-1">
                <Bookmark size={13} />
                Save
              </span>
            </button>
            <button
              type="button"
              onClick={actions.resetMentorChat}
              className="rounded-full bg-cyan-100/15 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      <div ref={chatWindowRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="space-y-4">
          {state.mentorChatHistory.map((message, index) => {
            const isAssistant = message.role === "assistant";
            const isLatest = index === state.mentorChatHistory.length - 1;
            const showCursor = isAssistant && isLatest && isLoading && Boolean(message.content);

            return (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
              >
                {isAssistant ? (
                  <div className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100/15 text-cyan-50">
                    <Bot size={16} />
                  </div>
                ) : null}

                <article
                  className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm sm:text-base ${
                    isAssistant
                      ? "glass-card text-cyan-50"
                      : "bg-gradient-to-br from-teal-300 to-cyan-400 text-slate-900 shadow-[0_0_24px_rgba(102,242,255,0.35)]"
                  }`}
                >
                  {message.content || (
                    <span className="inline-flex items-center gap-2 text-cyan-100/80">
                      {thinkingMessage}
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-100 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-100 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-100" />
                      </span>
                    </span>
                  )}
                  {showCursor ? <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-cyan-100 align-middle" /> : null}

                  {isAssistant && message.content ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cyan-100/15 pt-2 text-xs">
                      <span className="rounded-full bg-cyan-100/10 px-2 py-1 text-cyan-100">Confidence: High</span>
                      <span className="rounded-full bg-emerald-100/10 px-2 py-1 text-emerald-100">ATS Impact: +{atsImpact}%</span>
                    </div>
                  ) : null}

                  {isAssistant && message.content ? (
                    <div className="mt-2 flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCopy(message.content)}
                        className="inline-flex items-center gap-1 rounded-full bg-cyan-100/10 px-2 py-1 text-cyan-50 transition hover:bg-cyan-100/20"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(index)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1 rounded-full bg-cyan-100/10 px-2 py-1 text-cyan-50 transition hover:bg-cyan-100/20 disabled:opacity-60"
                      >
                        <RotateCcw size={12} />
                        Regenerate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleImproveAnswer(index)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1 rounded-full bg-cyan-100/10 px-2 py-1 text-cyan-50 transition hover:bg-cyan-100/20 disabled:opacity-60"
                      >
                        <Wand2 size={12} />
                        Improve
                      </button>
                    </div>
                  ) : null}
                </article>

                {!isAssistant ? (
                  <div className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100/15 text-cyan-50">
                    <User size={15} />
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-cyan-100/20 bg-[#071328]/85 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isImproving || isLoading}
            onClick={handleImproveResume}
            className="rounded-full border border-cyan-100/25 bg-cyan-100/10 px-3 py-1 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-100/20 disabled:opacity-60"
          >
            {isImproving ? "Improving..." : "Improve Resume"}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleExplainAtsScore}
            className="rounded-full border border-cyan-100/25 bg-cyan-100/10 px-3 py-1 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-100/20 disabled:opacity-60"
          >
            Explain ATS Score
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="glow-ring relative flex items-end gap-2 rounded-2xl border border-cyan-100/25 bg-slate-900/80 px-3 py-2 shadow-[0_0_26px_rgba(96,239,255,0.15)]">
            <textarea
              name="mentorQuestion"
              rows={2}
              required
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask for bullet rewrites, ATS fixes, skill-gap strategy..."
              className="max-h-32 w-full resize-none bg-transparent text-sm text-cyan-50 outline-none placeholder:text-cyan-100/55"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !draft.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-surface transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </form>
      </div>

      {!state.resumeId ? (
        <p className="mx-4 mb-3 rounded-xl border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-xs text-amber-100 sm:mx-6">
          Upload your resume for richer context.
          <Link to="/upload" className="ml-2 font-semibold underline underline-offset-2">
            Upload now
          </Link>
        </p>
      ) : null}

      {serviceNotice ? (
        <p className="mx-4 mb-3 rounded-xl border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-xs text-cyan-100 sm:mx-6">
          {serviceNotice}
        </p>
      ) : null}

      {error ? (
        <p className="mx-4 mb-4 rounded-xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-xs text-rose-100 sm:mx-6">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default MentorChatPage;
