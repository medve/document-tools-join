import * as amplitude from '@amplitude/analytics-browser';
import { getSystemInfo } from './system-info';

// Check if we're in a test environment
const isTestEnvironment = typeof window !== 'undefined' && (
  // Vitest sets NODE_ENV to 'test'
  import.meta.env.NODE_ENV === 'test' ||
  // Check for common test runners
  window.navigator?.userAgent?.includes('jsdom') ||
  // Check for vitest global
  'vi' in globalThis ||
  // Check for test-specific environment variables
  import.meta.env.VITE_TEST === 'true'
);

// Initialize Amplitude only in browser context and not during tests
if (typeof window !== 'undefined' && !isTestEnvironment) {
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
  if (typeof window === 'undefined' || isTestEnvironment) return; // Skip tracking in server context or tests
  
  amplitude.track(eventName, {
    ...systemInfo,
    ...eventProperties
  });
}

// Track errors with detailed information
export function trackError(error: Error | string, additionalProperties?: Record<string, unknown>) {
  if (typeof window === 'undefined' || isTestEnvironment) return; // Skip tracking in server context or tests
  
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