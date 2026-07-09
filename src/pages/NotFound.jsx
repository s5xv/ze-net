export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-2">404</h1>
        <p className="text-neutral-500">Page not found.</p>
        <a href="/" className="text-orange-500 hover:underline mt-4 inline-block">Go Home</a>
      </div>
    </div>
  );
}
