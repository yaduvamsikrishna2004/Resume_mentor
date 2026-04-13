import { createContext, useContext, useMemo, useState } from "react";

const ResumeMentorContext = createContext(null);

const initialState = {
  resumeId: "",
  filename: "",
  rawTextPreview: "",
  analysis: null,
  comparison: null,
  suggestions: [],
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

export function ResumeMentorProvider({ children }) {
  const [state, setState] = useState(initialState);

  const actions = useMemo(
    () => ({
      setUploadResult(data) {
        setState((prev) => ({
          ...prev,
          resumeId: data.resume_id || "",
          filename: data.filename || "",
          rawTextPreview: data.raw_text_preview || "",
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
      resetAll() {
        setState(initialState);
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
