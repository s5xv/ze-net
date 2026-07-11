import * as Sentry from '@sentry/react';

export default function SentryTest() {
  return (
    <button
      onClick={() => {
        Sentry.logger.info('User triggered test error', {
          action: 'test_error_button_click',
        });
        Sentry.metrics.count('test_counter', 1);
        throw new Error('This is your first error!');
      }}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
    >
      Test Sentry Error
    </button>
  );
}
