import { useRef, useState } from "react";
import { motion } from "framer-motion";

const beforeBullets = [
  "Worked on backend APIs for web app.",
  "Built some dashboards for users.",
  "Used Python and SQL in projects."
];

const afterBullets = [
  "Designed and deployed 14 REST APIs reducing request latency by 32% across core workflows.",
  "Built analytics dashboards used by 8 teams, improving decision turnaround from days to hours.",
  "Delivered Python + SQL data pipelines processing 1.2M records weekly with 99.8% reliability."
];

function ResumePanel({ title, bullets, tone }) {
  const palette =
    tone === "after"
      ? "border-emerald-200/25 bg-[#102437] text-emerald-50"
      : "border-rose-200/25 bg-[#1f2436] text-rose-50";

  return (
    <article className={`h-full rounded-2xl border p-5 ${palette}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-current/70">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {bullets.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </article>
  );
}

function BeforeAfterSection() {
  const [split, setSplit] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  function clampSplit(value) {
    return Math.max(0, Math.min(100, value));
  }

  function updateSplitFromClientX(clientX) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) {
      return;
    }
    const raw = ((clientX - rect.left) / rect.width) * 100;
    setSplit(clampSplit(raw));
  }

  function handlePointerDown(event) {
    setIsDragging(true);
    updateSplitFromClientX(event.clientX);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!isDragging) {
      return;
    }
    updateSplitFromClientX(event.clientX);
  }

  function stopDragging(event) {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-white sm:text-3xl">Before vs After Resume</h2>
        <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/75">Drag slider to compare</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className="relative overflow-hidden rounded-2xl select-none touch-none"
      >
        <div
          className={`absolute inset-0 z-[1] ${isDragging ? "" : "transition-[clip-path] duration-200 ease-out"}`}
          style={{ clipPath: `inset(0 0 0 ${split}%)` }}
        >
          <ResumePanel title="Before" bullets={beforeBullets} tone="before" />
        </div>

        <div
          className={`pointer-events-none absolute inset-0 z-[2] ${isDragging ? "" : "transition-[clip-path] duration-200 ease-out"}`}
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <ResumePanel title="After (AI Optimized)" bullets={afterBullets} tone="after" />
        </div>

        <div
          className={`pointer-events-none absolute bottom-0 top-0 z-[3] w-[2px] bg-cyan-200/85 shadow-[0_0_16px_rgba(125,246,255,0.7)] ${isDragging ? "" : "transition-[left] duration-200 ease-out"}`}
          style={{ left: `calc(${split}% - 1px)` }}
        />
        <button
          type="button"
          aria-label="Drag comparison slider"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          className={`absolute top-1/2 z-[4] h-7 w-7 -translate-y-1/2 rounded-full border border-cyan-100/70 bg-[#0b1b38] shadow-[0_0_18px_rgba(125,246,255,0.45)] ${isDragging ? "scale-105" : "transition-all duration-200"}`}
          style={{ left: `calc(${split}% - 14px)` }}
        />
        <div className="invisible">
          <ResumePanel title="Before" bullets={beforeBullets} tone="before" />
        </div>
      </motion.div>
    </section>
  );
}

export default BeforeAfterSection;
