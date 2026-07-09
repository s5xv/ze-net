export default function AchievementPopup({ achievement }) {
  if (!achievement) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-5 py-4 rounded-xl shadow-2xl border-2 border-yellow-300 max-w-sm">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{achievement.icon}</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">Achievement Unlocked!</p>
            <p className="text-lg font-bold">{achievement.title}</p>
            <p className="text-xs opacity-90">{achievement.description}</p>
            <p className="text-xs font-bold mt-1">+{achievement.xp} XP</p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.5s ease-out; }
      `}</style>
    </div>
  );
}
