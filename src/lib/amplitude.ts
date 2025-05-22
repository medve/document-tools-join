import * as amplitude from '@amplitude/analytics-browser';

// Initialize Amplitude with your API key
amplitude.init('820d9b1e90ed9b8f11d1c06c3624a270', {
  defaultTracking: {
    sessions: true,
    fileDownloads: false,
    pageViews: false
  }
});

// Export a function to track events
export function trackEvent(eventName: string, eventProperties?: Record<string, unknown>) {
  amplitude.track(eventName, eventProperties);
}

// Track errors with detailed information
export function trackError(error: Error | string, additionalProperties?: Record<string, unknown>) {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  trackEvent('error_occurred', {
    error_name: errorObj.name,
    error_message: errorObj.message,
    error_stack: errorObj.stack,
    ...additionalProperties
  });
}

// Set up global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    trackError(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason, {
      type: 'unhandledrejection'
    });
  });
}

// Export amplitude instance for direct access if needed
export { amplitude }; 