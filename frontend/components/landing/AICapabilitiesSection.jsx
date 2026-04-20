import { motion } from "framer-motion";
import { Brain, Bot, SearchCheck } from "lucide-react";

import TiltCard from "../ui/TiltCard";

const capabilities = [
  {
    icon: SearchCheck,
    title: "NLP Parsing",
    description: "Extracts skills, entities, and experience signals from raw resume files with instant structure."
  },
  {
    icon: Brain,
    title: "Skill Intelligence",
    description: "Maps job requirements to your profile and prioritizes missing skills that impact ATS scores."
  },
  {
    icon: Bot,
    title: "AI Mentoring",
    description: "Provides contextual coaching, bullet rewrites, and interview-aligned career guidance."
  }
];

function AICapabilitiesSection() {
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl text-white sm:text-3xl">AI Capabilities</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {capabilities.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <TiltCard className="glass-card h-full rounded-3xl p-5 transition hover:-translate-y-1">
                <div className="inline-flex rounded-xl bg-cyan-100/15 p-3 text-accent">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-display text-xl text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-cyan-50/90">{item.description}</p>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default AICapabilitiesSection;
