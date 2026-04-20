function SuggestionsCard({ suggestions = [] }) {
  return (
    <section className="glass-card rounded-3xl p-5">
      <p className="mb-4 font-display text-lg text-white">Suggestions</p>
      <div className="space-y-3">
        {suggestions.length ? (
          suggestions.map((item, index) => (
            <article key={`${item.skill}-${index}`} className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 p-4 transition hover:bg-cyan-100/10">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-soft">{item.skill}</p>
              <p className="mt-2 text-sm text-cyan-50">{item.learning_suggestion}</p>
              <p className="mt-1 text-sm text-cyan-50/90">{item.project_suggestion}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-cyan-100/70">No suggestions generated yet.</p>
        )}
      </div>
    </section>
  );
}

export default SuggestionsCard;
