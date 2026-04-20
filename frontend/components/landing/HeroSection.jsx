import { motion } from "framer-motion";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
};

function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl glass-card-strong px-6 py-16 sm:px-10 lg:px-14">
      <div className="absolute -left-16 top-4 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl" />
      <div className="absolute -right-20 bottom-4 h-56 w-56 rounded-full bg-blue-400/25 blur-3xl" />

      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.6 }}
        variants={fadeUp}
        className="relative z-10 max-w-3xl"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          <Sparkles size={14} />
          AI Career Co-Pilot
        </span>

        <h1 className="mt-5 font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
          AI Resume Mentor
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-cyan-50/90 sm:text-lg">
          Analyze resumes, improve ATS score, and close skill gaps with AI.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-surface transition hover:brightness-110"
          >
            <FileText size={16} />
            Upload Resume
          </Link>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-100/15 px-6 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
          >
            Try Demo
            <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

export default HeroSection;
