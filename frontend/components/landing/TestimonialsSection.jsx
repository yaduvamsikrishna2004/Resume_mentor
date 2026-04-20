const testimonials = [
  {
    name: "Priya S.",
    role: "Backend Developer",
    quote: "My ATS score jumped from 56 to 83 after applying the missing skill recommendations."
  },
  {
    name: "Rahul K.",
    role: "Data Analyst",
    quote: "The mentor chat rewrote my project bullets with impact metrics that recruiters noticed."
  }
];

function TestimonialsSection() {
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl text-white sm:text-3xl">Candidate Results</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {testimonials.map((item) => (
          <article key={item.name} className="glass-card rounded-3xl p-6">
            <p className="text-sm leading-7 text-cyan-50/90">"{item.quote}"</p>
            <p className="mt-4 font-semibold text-white">{item.name}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/70">{item.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default TestimonialsSection;
