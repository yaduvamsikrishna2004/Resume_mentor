import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ResumeMentorContext = createContext(null);

const STORAGE_KEY = "resume_mentor_state_v2";
const THEME_KEY = "resume_mentor_theme";

const initialState = {
  themeMode: "dark",
  resumeId: "",
  filename: "",
  rawTextPreview: "",
  rawResumeText: "",
  lastJobDescription: "",
  analysis: null,
  comparison: null,
  suggestions: [],
  savedResults: [],
  savedMentorChats: [],
  resumeVersions: [],
  analysisHistory: [
    {
      role: "assistant",
      content: "Upload your resume, then paste a job description to analyze skill gaps."
    }
  ],
  mentorChatHistory: [
    {
      role: "assistant",
      content:
        "I am your Gemini resume mentor. Ask me how to improve your resume, projects, ATS score, or interview prep."
    }
  ]
};

function hydrateState() {
  if (typeof window === "undefined") {
    return initialState;
  }
  try {
    // Persist core workflow state so users can continue where they left off.
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    const rawTheme = window.localStorage.getItem(THEME_KEY);
    const parsed = rawState ? JSON.parse(rawState) : {};
    return {
      ...initialState,
      ...parsed,
      themeMode: rawTheme === "light" ? "light" : "dark"
    };
  } catch {
    return initialState;
  }
}

export function ResumeMentorProvider({ children }) {
  const [state, setState] = useState(hydrateState);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.classList.toggle("light", state.themeMode === "light");
    window.localStorage.setItem(THEME_KEY, state.themeMode);
  }, [state.themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // Keep persisted history/results lightweight and bounded.
    const persistable = {
      resumeId: state.resumeId,
      filename: state.filename,
      rawTextPreview: state.rawTextPreview,
      rawResumeText: state.rawResumeText,
      lastJobDescription: state.lastJobDescription,
      analysis: state.analysis,
      comparison: state.comparison,
      suggestions: state.suggestions,
      savedResults: state.savedResults,
      savedMentorChats: state.savedMentorChats,
      resumeVersions: state.resumeVersions,
      analysisHistory: state.analysisHistory,
      mentorChatHistory: state.mentorChatHistory
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [state]);

  const actions = useMemo(
    () => ({
      setUploadResult(data) {
        setState((prev) => ({
          ...prev,
          resumeId: data.resume_id || "",
          filename: data.filename || "",
          rawTextPreview: data.raw_text_preview || "",
          rawResumeText: data.raw_text || "",
          analysis: data.extracted || null
        }));
      },
      setAnalysis(analysis) {
        setState((prev) => ({ ...prev, analysis }));
      },
      setComparison(comparison) {
        setState((prev) => ({ ...prev, comparison }));
      },
      setJobDescription(jobDescription) {
        setState((prev) => ({ ...prev, lastJobDescription: jobDescription }));
      },
      setSuggestions(suggestions) {
        setState((prev) => ({ ...prev, suggestions }));
      },
      saveCurrentResult(label = "Saved analysis") {
        setState((prev) => {
          if (!prev.comparison) {
            return prev;
          }
          const normalizedLabel = "Saved Analysis";
          const currentComparison = prev.comparison || {};
          const currentSuggestions = prev.suggestions || [];

          const isMeaningful =
            Number(currentComparison?.ats_score || 0) > 0 ||
            (currentComparison?.missing_skills || []).length > 0 ||
            (currentComparison?.matching_skills || []).length > 0 ||
            currentSuggestions.length > 0;
          if (!isMeaningful) {
            return prev;
          }

          const duplicate = prev.savedResults.find((item) => {
            const sameScore = Number(item?.comparison?.ats_score || 0) === Number(currentComparison?.ats_score || 0);
            const sameMissing =
              JSON.stringify(item?.comparison?.missing_skills || []) ===
              JSON.stringify(currentComparison?.missing_skills || []);
            const sameMatching =
              JSON.stringify(item?.comparison?.matching_skills || []) ===
              JSON.stringify(currentComparison?.matching_skills || []);
            return sameScore && sameMissing && sameMatching;
          });
          if (duplicate) {
            return prev;
          }

          const snapshot = {
            id: `${Date.now()}`,
            label: normalizedLabel,
            timestamp: new Date().toISOString(),
            comparison: currentComparison,
            suggestions: currentSuggestions,
            resume_version: prev.resumeVersions[0]?.label || "",
            summary:
              currentSuggestions[0]?.learning_suggestion ||
              `Focus on ${(currentComparison?.missing_skills || []).slice(0, 2).join(", ") || "role alignment"}`
          };
          return {
            ...prev,
            savedResults: [snapshot, ...prev.savedResults].slice(0, 8)
          };
        });
      },
      loadSavedResult(resultId) {
        setState((prev) => {
          const found = prev.savedResults.find((item) => item.id === resultId);
          if (!found) {
            return prev;
          }
          return {
            ...prev,
            comparison: found.comparison || prev.comparison,
            suggestions: found.suggestions || prev.suggestions
          };
        });
      },
      pushAnalysisMessage(message) {
        setState((prev) => ({
          ...prev,
          analysisHistory: [...prev.analysisHistory, message]
        }));
      },
      pushMentorMessage(message) {
        setState((prev) => ({
          ...prev,
          mentorChatHistory: [...prev.mentorChatHistory, message]
        }));
      },
      appendToLastMentorMessage(delta) {
        setState((prev) => {
          const history = [...prev.mentorChatHistory];
          if (!history.length || history[history.length - 1].role !== "assistant") {
            history.push({ role: "assistant", content: delta });
          } else {
            history[history.length - 1] = {
              ...history[history.length - 1],
              content: `${history[history.length - 1].content || ""}${delta}`
            };
          }
          return { ...prev, mentorChatHistory: history };
        });
      },
      saveMentorChatSession(label = "Mentor session") {
        setState((prev) => {
          const snapshot = {
            id: `${Date.now()}`,
            label,
            timestamp: new Date().toISOString(),
            messages: prev.mentorChatHistory
          };
          return {
            ...prev,
            savedMentorChats: [snapshot, ...prev.savedMentorChats].slice(0, 12)
          };
        });
      },
      loadMentorChatSession(sessionId) {
        setState((prev) => {
          const found = prev.savedMentorChats.find((item) => item.id === sessionId);
          if (!found) {
            return prev;
          }
          return {
            ...prev,
            mentorChatHistory: found.messages
          };
        });
      },
      addResumeVersion(versionPayload) {
        setState((prev) => {
          const version = {
            id: `${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...versionPayload
          };
          return {
            ...prev,
            resumeVersions: [version, ...prev.resumeVersions].slice(0, 12)
          };
        });
      },
      resetMentorChat() {
        setState((prev) => ({
          ...prev,
          mentorChatHistory: initialState.mentorChatHistory
        }));
      },
      toggleTheme() {
        setState((prev) => ({
          ...prev,
          themeMode: prev.themeMode === "dark" ? "light" : "dark"
        }));
      },
      resetAll() {
        setState((prev) => ({
          ...initialState,
          themeMode: prev.themeMode
        }));
      }
    }),
    []
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <ResumeMentorContext.Provider value={value}>{children}</ResumeMentorContext.Provider>;
}

export function useResumeMentor() {
  const context = useContext(ResumeMentorContext);
  if (!context) {
    throw new Error("useResumeMentor must be used inside ResumeMentorProvider");
  }
  return context;
}
