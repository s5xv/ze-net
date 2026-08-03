import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

export default function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    apiFetch('/api/app?action=list-announcements')
      .then(d => setAnnouncements(d.announcements || []))
      .catch(() => {});
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs py-1.5 px-4 overflow-hidden flex-shrink-0">
      <div className="max-w-6xl mx-auto flex items-center gap-3 overflow-hidden">
        <span className="font-bold uppercase tracking-wider bg-white/20 rounded px-2 py-0.5 text-[10px] flex-shrink-0">Announcement</span>
        <div className="overflow-hidden flex-1 whitespace-nowrap">
          <div className="inline-block animate-marquee" style={{ animation: 'marquee 25s linear infinite' }}>
            {announcements.map((a, i) => (
              <span key={a.id}>
                <span className="font-bold">{a.title}:</span> {a.content}
                {i < announcements.length - 1 && <span className="mx-4">•</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }`}</style>
    </div>
  );
}
