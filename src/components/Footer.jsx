export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-gray-700 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto mb-2">
            Z&E Net is an independent search directory and is not affiliated with, endorsed by, or officially connected to DemocracyCraft or its official wiki. All search redirects utilize publicly available data in accordance with the Creative Commons Attribution-ShareAlike 4.0 International license.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} Z&E Net. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
