const logos = ["GOOGLE", "AMAZON", "NETFLIX", "STRIPE", "AIRBNB", "SPOTIFY"];

function TrustedBySection() {
  return (
    <section className="space-y-4">
      <p className="text-center text-xs uppercase tracking-[0.22em] text-cyan-100/70">Trusted by Developers</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {logos.map((item) => (
          <article
            key={item}
            className="rounded-2xl border border-cyan-100/20 bg-cyan-100/5 px-3 py-4 text-center text-xs font-semibold tracking-[0.2em] text-cyan-100/85"
          >
            {item}
          </article>
        ))}
      </div>
    </section>
  );
}

export default TrustedBySection;
