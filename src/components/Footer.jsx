export default function Footer() {
  return (
    <footer className="bg-neutral-100 dark:bg-[#0a0a0a] border-t border-neutral-200 dark:border-white/5 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-4 justify-center text-sm mb-6">
          <a href="/wiki" className="text-neutral-500 hover:text-orange-500 transition-colors">Wiki</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/forums" className="text-neutral-500 hover:text-orange-500 transition-colors">Forums</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/departments" className="text-neutral-500 hover:text-orange-500 transition-colors">Departments</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/utilities" className="text-neutral-500 hover:text-orange-500 transition-colors">Utilities</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/challenge" className="text-neutral-500 hover:text-orange-500 transition-colors">Challenge</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/achievements" className="text-neutral-500 hover:text-orange-500 transition-colors">Achievements</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/leaderboard" className="text-neutral-500 hover:text-orange-500 transition-colors">Leaderboard</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/mining-game" className="text-neutral-500 hover:text-orange-500 transition-colors">Mining</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/wiki-finder" className="text-neutral-500 hover:text-orange-500 transition-colors">Wiki Finder</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/changelog" className="text-neutral-500 hover:text-orange-500 transition-colors">Changelog</a>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a href="/contact" className="text-neutral-500 hover:text-orange-500 transition-colors">Contact</a>
        </div>

        <div className="flex flex-col items-center mb-6">
          <img 
            src="/assets/logo.png" 
            alt="Z&E Net" 
            className="h-16 w-16 object-contain mb-3"
            style={{ imageRendering: 'pixelated' }}
          />
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
            DemocracyCraft Centralized Directory
          </p>
        </div>

        <div className="text-center mb-6">
          <a 
            href="https://gnomefundme.org/c/ze-net-build-the-duckduckgo-of-democracycraft" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Support Z&E Net Development
          </a>
        </div>

        <div className="border-t border-neutral-200 dark:border-white/5 pt-6">
          <p className="text-xs text-neutral-500 dark:text-neutral-500 text-center leading-relaxed max-w-3xl mx-auto">
            Z&E Net is an independent search directory and is not affiliated with, endorsed by, or officially connected to DemocracyCraft or its official wiki. All search redirects utilize publicly available data in accordance with the Creative Commons Attribution-ShareAlike 4.0 International license.
          </p>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            © {new Date().getFullYear()} Z&E Net. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
