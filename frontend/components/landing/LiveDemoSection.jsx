import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const phases = ["Uploading resume...", "Running NLP parsing...", "Calculating ATS score...", "Generating AI insights..."];

function LiveDemoSection() {
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(42);
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev >= 100 ? 100 : prev + 3;
        setScore(Math.min(93, 42 + Math.round(next * 0.52)));
        setPhaseIndex(Math.min(phases.length - 1, Math.floor(next / 25)));
        return next;
      });
    }, 120);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-white sm:text-3xl">Live Demo Preview</h2>
        <span className="rounded-full bg-cyan-100/15 px-3 py-1 text-sm font-semibold text-cyan-50">Realtime ATS Scan</span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/70">Resume Pipeline</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-cyan-100/10">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-teal-300"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
          <p className="mt-3 text-sm text-cyan-50/85">
            {phases[phaseIndex]} {Math.round(progress)}%
          </p>
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="skeleton h-3 rounded" style={{ width: `${88 - idx * 18}%` }} />
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/70">ATS Compatibility</p>
          <p className="mt-2 font-display text-4xl text-cyan-50">{score}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-cyan-100/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.2 }}
              className="h-full bg-gradient-to-r from-teal-300 via-cyan-300 to-sky-400"
            />
          </div>
          <p className="mt-3 text-sm text-cyan-100/80">Score increases as keyword coverage, quantified impact, and role-fit improve.</p>
        </article>
      </div>
    </section>
  );
}

export default LiveDemoSection;
