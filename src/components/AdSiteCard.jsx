export default function AdSiteCard({ site, tier }) {
  // Define styles based on tier
  const styles = {
    elite: "border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] bg-gradient-to-br from-slate-900 to-cyan-900/20",
    premium: "border-2 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]",
    featured: "border-2 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]",
    standard: "border border-blue-400/50 bg-blue-50/5 dark:bg-blue-900/10",
    none: "border border-gray-200 dark:border-gray-700"
  };

  const badges = {
    elite: <span className="px-2 py-1 bg-cyan-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">💎 Elite</span>,
    premium: <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">👑 Premium</span>,
    featured: <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full uppercase tracking-wider">⭐ Featured</span>,
    standard: <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">Sponsored</span>,
  };

  return (
    <div className={`rounded-xl p-4 transition-all hover:scale-[1.02] ${styles[tier] || styles.none}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          {site.name}
          {site.is_verified && <span className="text-blue-400 text-sm">✓</span>}
        </h3>
        {badges[tier]}
      </div>
      <p className="text-sm text-gray-300 line-clamp-2">{site.description}</p>
      <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
        Visit Site
      </button>
    </div>
  );
}
