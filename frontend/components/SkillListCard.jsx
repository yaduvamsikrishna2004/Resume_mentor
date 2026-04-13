function SkillListCard({ title, skills = [], color = "cyan" }) {
  const colorClasses = {
    cyan: "bg-cyan-100/10 text-cyan-100 border-cyan-100/20",
    green: "bg-emerald-200/10 text-emerald-100 border-emerald-200/20",
    red: "bg-rose-200/10 text-rose-100 border-rose-200/20"
  };

  return (
    <section className="glass-card rounded-3xl p-5">
      <p className="mb-4 font-display text-lg text-white">{title}</p>
      <div className="flex flex-wrap gap-2">
        {skills.length ? (
          skills.map((skill) => (
            <span
              key={skill}
              className={`rounded-full border px-3 py-1 text-sm capitalize ${colorClasses[color] || colorClasses.cyan}`}
            >
              {skill}
            </span>
          ))
        ) : (
          <p className="text-sm text-cyan-100/70">No items available.</p>
        )}
      </div>
    </section>
  );
}

export default SkillListCard;
