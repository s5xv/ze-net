export default function SentryTest() {
  return (
    <button
      onClick={() => {
        throw new Error('This is your first error!');
      }}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
    >
      Test Sentry Error
    </button>
  );
}
