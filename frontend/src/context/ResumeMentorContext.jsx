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
  analysis: null,
  comparison: null,
  suggestions: [],
  savedResults: [],
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
      analysis: state.analysis,
      comparison: state.comparison,
      suggestions: state.suggestions,
      savedResults: state.savedResults,
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
      setSuggestions(suggestions) {
        setState((prev) => ({ ...prev, suggestions }));
      },
      saveCurrentResult(label = "Saved analysis") {
        setState((prev) => {
          if (!prev.comparison) {
            return prev;
          }
          const snapshot = {
            id: `${Date.now()}`,
            label,
            timestamp: new Date().toISOString(),
            comparison: prev.comparison,
            suggestions: prev.suggestions
          };
          return {
            ...prev,
            savedResults: [snapshot, ...prev.savedResults].slice(0, 8)
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
