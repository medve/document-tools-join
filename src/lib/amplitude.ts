import * as amplitude from '@amplitude/analytics-browser';
import { getSystemInfo } from './system-info';

// Initialize Amplitude only in browser context
if (typeof window !== 'undefined') {
  amplitude.init(import.meta.env.VITE_AMPLITUDE_API_KEY || '820d9b1e90ed9b8f11d1c06c3624a270', {
    identityStorage: 'localStorage', 
    defaultTracking: {  
      sessions: true, 
      fileDownloads: false,
      pageViews: false
    }
  });
}

// Get system information
const systemInfo = getSystemInfo();

// Export a function to track events
export function trackEvent(eventName: string, eventProperties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return; // Skip tracking in server context
  
  amplitude.track(eventName, {
    ...systemInfo,
    ...eventProperties
  });
}

// Track errors with detailed information
export function trackError(error: Error | string, additionalProperties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return; // Skip tracking in server context
  
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  // Skip tracking specific PDF processing warnings
  if (
    errorObj.message?.includes('invalid marked content and clip nesting') ||
    errorObj.message?.includes('closepath with no current point')
  ) {
    return;
  }
  
  trackEvent('error_occurred', {
    error_name: errorObj.name,
    error_message: errorObj.message,
    error_stack: errorObj.stack,
    ...additionalProperties
  });
}

// Set up global error handler only in browser context
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