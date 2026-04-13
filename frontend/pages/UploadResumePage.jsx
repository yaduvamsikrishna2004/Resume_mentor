import { useState } from "react";
import { Link } from "react-router-dom";

import FileDropzone from "../components/FileDropzone";
import { uploadResume } from "../src/api/client";
import { useResumeMentor } from "../src/context/ResumeMentorContext";

function UploadResumePage() {
  const { state, actions } = useResumeMentor();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(file) {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".docx")) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      const response = await uploadResume(file);
      actions.setUploadResult(response.data);
    } catch (uploadError) {
      setError(uploadError.message || "Failed to upload resume.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <FileDropzone onFileSelect={handleUpload} isLoading={isLoading} />
        {error ? (
          <p className="rounded-2xl border border-rose-200/30 bg-rose-200/10 px-4 py-3 text-sm text-rose-100">{error}</p>
        ) : null}
      </div>

      <aside className="glass-card rounded-3xl p-5">
        <p className="font-display text-lg text-white">Current Resume Snapshot</p>
        <div className="mt-4 space-y-2 text-sm text-cyan-50/90">
          <p>
            <span className="text-cyan-100/70">File:</span> {state.filename || "No resume uploaded"}
          </p>
          <p>
            <span className="text-cyan-100/70">Resume ID:</span> {state.resumeId || "-"}
          </p>
          <p>
            <span className="text-cyan-100/70">Skills detected:</span>{" "}
            {state.analysis?.skills?.length || 0}
          </p>
          <p>
            <span className="text-cyan-100/70">Education lines:</span>{" "}
            {state.analysis?.education?.length || 0}
          </p>
        </div>

        <p className="mt-4 rounded-2xl bg-cyan-100/10 p-3 text-xs leading-5 text-cyan-100/80">
          {state.rawTextPreview || "Parsed text preview will appear after upload."}
        </p>

        <div className="mt-5 grid gap-2">
          <Link
            to="/chat"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface transition hover:brightness-105"
          >
            Open Skill Gap Analysis
          </Link>
          <Link
            to="/mentor"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-100/15 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
          >
            Open Gemini Chatbot
          </Link>
        </div>
      </aside>
    </section>
  );
}

export default UploadResumePage;
