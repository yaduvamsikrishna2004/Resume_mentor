function ChatPanel({ messages, onAnalyzeSubmit, isAnalyzeLoading }) {
  return (
    <section className="glass-card rounded-3xl p-4 sm:p-6">
      <div className="max-h-[480px] overflow-y-auto pr-1">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-3xl rounded-2xl px-4 py-3 text-sm sm:text-base ${
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

      <form onSubmit={onAnalyzeSubmit} className="mt-5 flex flex-col gap-3">
        <label htmlFor="jobDescription" className="font-display text-sm uppercase tracking-wide text-cyan-100">
          Job Description
        </label>
        <textarea
          id="jobDescription"
          name="jobDescription"
          rows={6}
          required
          placeholder="Paste the job description. The mentor will extract required skills and compare them to your resume."
          className="w-full rounded-2xl border border-cyan-100/20 bg-slate-900/70 px-4 py-3 text-cyan-50 outline-none transition focus:border-accent"
          disabled={isAnalyzeLoading}
        />
        <button
          type="submit"
          disabled={isAnalyzeLoading}
          className="w-full rounded-2xl bg-accent px-4 py-3 font-semibold text-surface transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isAnalyzeLoading ? "Analyzing..." : "Analyze Skill Gap"}
        </button>
      </form>
    </section>
  );
}

export default ChatPanel;
