import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const assistantReply =
  "Great question. For this backend role, strengthen impact signals by quantifying latency improvement, deployment ownership, and scale. I also recommend adding Docker, CI/CD, and monitoring keywords in your project bullets.";

function ChatPreviewSection() {
  const [visibleReply, setVisibleReply] = useState("");

  useEffect(() => {
    let cursor = 0;
    const timer = setInterval(() => {
      cursor += 1;
      setVisibleReply(assistantReply.slice(0, cursor));
      if (cursor >= assistantReply.length) {
        clearInterval(timer);
      }
    }, 22);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <h2 className="font-display text-2xl text-white sm:text-3xl">Realtime AI Chat Preview</h2>
      <div className="mt-5 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface"
        >
          Rewrite my project bullets for a backend internship at scale-focused startups.
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="max-w-3xl rounded-2xl bg-cyan-100/15 px-4 py-3 text-sm text-cyan-50"
        >
          {visibleReply}
          <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-cyan-100 align-middle" />
        </motion.div>
      </div>
    </section>
  );
}

export default ChatPreviewSection;
