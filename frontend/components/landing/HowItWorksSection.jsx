import { CheckCircle2 } from "lucide-react";

const steps = ["Upload Resume", "Analyze", "Improve", "Get Hired"];

function HowItWorksSection() {
  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <h2 className="font-display text-2xl text-white sm:text-3xl">How It Works</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/70">Step {index + 1}</p>
            <p className="mt-2 flex items-center gap-2 font-semibold text-cyan-50">
              <CheckCircle2 size={16} className="text-accent" />
              {step}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorksSection;
