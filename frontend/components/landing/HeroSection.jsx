import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import MagneticButton from "../ui/MagneticButton";

const HEADLINES = [
  "Turn your resume into interviews.",
  "Increase ATS score instantly.",
  "AI-powered career acceleration."
];

const METRICS = [
  { label: "ATS Score", value: "91%" },
  { label: "Matched Skills", value: "18/21" },
  { label: "AI Actions", value: "42" }
];

function HeroSection() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 });
  const [chatPreview, setChatPreview] = useState("");

  const headline = useMemo(() => HEADLINES[headlineIndex], [headlineIndex]);
  const fullPreview =
    "Strong fit for backend roles. Add one quantified bullet around latency reduction and mention Docker + CI/CD ownership.";

  useEffect(() => {
    let cursor = 0;
    const timer = setInterval(() => {
      cursor += 1;
      setTypedText(headline.slice(0, cursor));
      if (cursor >= headline.length) {
        clearInterval(timer);
        setTimeout(() => {
          setTypedText("");
          setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
        }, 1500);
      }
    }, 42);
    return () => clearInterval(timer);
  }, [headline]);

  useEffect(() => {
    let cursor = 0;
    const timer = setInterval(() => {
      cursor += 1;
      setChatPreview(fullPreview.slice(0, cursor));
      if (cursor >= fullPreview.length) {
        clearInterval(timer);
      }
    }, 20);
    return () => clearInterval(timer);
  }, []);

  function handleMouseMove(event) {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setSpotlight({ x, y });
  }

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden rounded-3xl glass-card-strong px-6 py-14 sm:px-10 lg:px-12"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(700px circle at ${spotlight.x}% ${spotlight.y}%, rgba(88,233,255,0.16), transparent 45%)`
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(90,196,255,0.16),transparent_30%),radial-gradient(circle_at_82%_26%,rgba(0,242,210,0.13),transparent_30%),linear-gradient(130deg,rgba(17,27,58,0.86),rgba(6,16,36,0.86))]" />
      <div className="blob left-[8%] top-[6%] h-48 w-48 bg-cyan-300/60" />
      <div className="blob right-[16%] top-[12%] h-56 w-56 bg-sky-500/45" style={{ animationDelay: "1.5s" }} />
      <div className="blob left-[45%] bottom-[-3rem] h-44 w-44 bg-teal-300/40" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50">
            <ShieldCheck size={14} />
            AI Career Co-Pilot
          </span>

          <h1 className="mt-5 min-h-24 font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
            {typedText}
            <span className="ml-1 inline-block h-9 w-[2px] animate-pulse bg-cyan-100 align-middle" />
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-cyan-50/90 sm:text-lg">
            Premium AI workflow for resume optimization, ATS score acceleration, and interview conversion.
          </p>

          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-cyan-100/75">Used by 10,000+ developers (demo)</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <MagneticButton
              className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-surface transition hover:brightness-110"
              onClick={() => navigate("/upload")}
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={16} />
                Launch Platform
              </span>
            </MagneticButton>
            <MagneticButton
              className="glow-ring rounded-2xl bg-cyan-100/15 px-6 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-100/25"
              onClick={() => navigate("/chat")}
            >
              <span className="inline-flex items-center gap-2">
                Watch Live Demo
                <ArrowRight size={16} />
              </span>
            </MagneticButton>
          </div>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1 }}
          className="glass-card rounded-3xl p-4 sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/70">Live AI Dashboard</p>
            <span className="rounded-full bg-emerald-300/20 px-2 py-1 text-[11px] font-semibold text-emerald-100">ONLINE</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {METRICS.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-cyan-100/20 bg-cyan-100/5 p-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/70">{metric.label}</p>
                <p className="mt-1 font-display text-xl text-cyan-50">{metric.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-cyan-100/20 bg-[#07172d]/80 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/70">AI Chat Insight</p>
            <p className="mt-2 min-h-14 text-sm leading-6 text-cyan-50/90">
              {chatPreview}
              <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-cyan-100 align-middle" />
            </p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-cyan-100/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "91%" }}
              transition={{ duration: 1.3, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-teal-300"
            />
          </div>
        </motion.article>
      </div>
    </section>
  );
}

export default HeroSection;
