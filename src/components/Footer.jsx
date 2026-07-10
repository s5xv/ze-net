export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-[#171717] border-t border-gray-200 dark:border-gray-800">
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <span className="text-sm text-gray-600 dark:text-gray-400">DemocracyCraft</span>
      </div>
      <div className="px-4 sm:px-6 py-3 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
        <a href="/about" className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline">About</a>
        <a href="/contact" className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline">Contact</a>
        <a href="/changelog" className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline">Changelog</a>
      </div>
      <div className="px-4 sm:px-6 py-3 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Z&E Net is an independent search directory not affiliated with DemocracyCraft. 
          Data used under CC BY-SA 4.0 license.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
          © {new Date().getFullYear()} Z&E Net
        </p>
      </div>
    </footer>
  );
}
