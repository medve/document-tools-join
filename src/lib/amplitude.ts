import * as amplitude from '@amplitude/analytics-browser';
import { getSystemInfo } from './system-info';

// Initialize Amplitude only in browser context
if (typeof window !== 'undefined') {
  amplitude.init(import.meta.env.VITE_AMPLITUDE_API_KEY, {
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

// Export amplitude instance for direct access if needed
export { amplitude }; 