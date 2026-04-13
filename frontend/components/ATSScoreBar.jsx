function ATSScoreBar({ score = 0 }) {
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg text-white">ATS Compatibility</p>
        <span className="rounded-full bg-cyan-100/15 px-3 py-1 text-sm text-cyan-50">{score}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-cyan-100/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-300 to-lime-300 transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(score, 100))}%` }}
        />
      </div>
    </div>
  );
}

export default ATSScoreBar;
