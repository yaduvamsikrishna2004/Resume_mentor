import { motion } from "framer-motion";
import { Bot, ScanSearch, Target } from "lucide-react";

const features = [
  {
    icon: ScanSearch,
    title: "Resume Analysis",
    description: "NLP parsing extracts skills, education, and experience signals in seconds."
  },
  {
    icon: Target,
    title: "Skill Gap Detection",
    description: "Compare resume strengths with any job description and spot high-priority gaps."
  },
  {
    icon: Bot,
    title: "AI Resume Chatbot",
    description: "Get contextual coaching, rewrite bullets, and improve your ATS profile using AI."
  }
];

function FeaturesSection() {
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl text-white sm:text-3xl">Features Built for Job Hunters</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="glass-card rounded-3xl p-5 transition hover:-translate-y-1"
            >
              <div className="inline-flex rounded-xl bg-cyan-100/15 p-3 text-accent">
                <Icon size={20} />
              </div>
              <h3 className="mt-4 font-display text-xl text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-cyan-50/90">{feature.description}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

export default FeaturesSection;
