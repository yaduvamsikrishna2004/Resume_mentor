import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import MagneticButton from "../ui/MagneticButton";

function StickyCTASection() {
  const navigate = useNavigate();

  return (
    <section className="sticky bottom-6 z-20">
      <div className="relative overflow-hidden glass-card-strong rounded-3xl px-5 py-4 sm:px-7 sm:py-5">
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-[linear-gradient(120deg,rgba(100,248,255,0.12),transparent_40%,rgba(105,238,255,0.16))]" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl text-white">Ready to upgrade your resume today?</p>
            <p className="text-sm text-cyan-100/80">Start improving your resume in 30 seconds.</p>
          </div>
          <MagneticButton
            onClick={() => navigate("/upload")}
            className="glow-ring rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-surface transition hover:scale-[1.02] hover:brightness-110"
          >
            <span className="inline-flex items-center gap-2">
              Start Free Analysis
              <ArrowUpRight size={16} />
            </span>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

export default StickyCTASection;
