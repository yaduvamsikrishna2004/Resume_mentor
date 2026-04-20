import { motion } from "framer-motion";

function ATSPreviewSection() {
  const score = 84;

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-white sm:text-3xl">ATS Score Preview</h2>
        <span className="rounded-full bg-cyan-100/15 px-3 py-1 text-sm font-semibold text-cyan-50">{score}% Match</span>
      </div>
      <p className="mt-3 text-sm text-cyan-50/85">
        Instant benchmark of how closely your current resume matches the target role.
      </p>
      <div className="mt-5 h-4 overflow-hidden rounded-full bg-cyan-100/15">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-300"
        />
      </div>
    </section>
  );
}

export default ATSPreviewSection;
