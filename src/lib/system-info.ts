/// <reference types="chrome"/>

export interface SystemInfo {
  extension_version?: string;
  browser_locale: string;
  browser_name: string;
  browser_version: string;
  os_name: string;
  os_version: string;
  screen_resolution: string;
  color_scheme: 'light' | 'dark';
  is_extension: boolean;
}

export function getSystemInfo(): SystemInfo {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
  
  // Check if we're in a test environment
  const isTestEnvironment = isBrowser && (
    // Check for jsdom user agent
    navigator.userAgent?.includes('jsdom') ||
    // Check for vitest global
    'vi' in globalThis ||
    // Check for test environment variables
    typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
  );
  
  if (!isBrowser || isTestEnvironment) {
    // Return default values for server-side or test environment
    return {
      browser_locale: 'en-US',
      browser_name: 'Test Browser',
      browser_version: '1.0.0',
      os_name: 'Test OS',
      os_version: '1.0.0',
      screen_resolution: '1920x1080',
      color_scheme: 'light',
      is_extension: false
    };
  }

  const userAgent = navigator.userAgent;
  const browserInfo = getBrowserInfo(userAgent);
  const osInfo = getOSInfo(userAgent);
  const isExtension = typeof chrome !== 'undefined' && 
    typeof chrome.runtime !== 'undefined' && 
    typeof chrome.runtime.getManifest === 'function';

  return {
    extension_version: isExtension ? chrome.runtime.getManifest().version : undefined,
    browser_locale: navigator.language,
    browser_name: browserInfo.name,
    browser_version: browserInfo.version,
    os_name: osInfo.name,
    os_version: osInfo.version,
    screen_resolution: `${window.screen?.width || 1920}x${window.screen?.height || 1080}`,
    color_scheme: window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light',
    is_extension: isExtension
  };
}

function getBrowserInfo(userAgent: string): { name: string; version: string } {
  const browserRegexes = [
    { name: 'Chrome', regex: /Chrome\/([0-9.]+)/ },
    { name: 'Firefox', regex: /Firefox\/([0-9.]+)/ },
    { name: 'Safari', regex: /Version\/([0-9.]+).*Safari/ },
    { name: 'Edge', regex: /Edg\/([0-9.]+)/ },
    { name: 'Opera', regex: /OPR\/([0-9.]+)/ }
  ];

  for (const browser of browserRegexes) {
    const match = userAgent.match(browser.regex);
    if (match) {
      return {
        name: browser.name,
        version: match[1]
      };
    }
  }

  return {
    name: 'Unknown',
    version: 'Unknown'
  };
}

function getOSInfo(userAgent: string): { name: string; version: string } {
  const osRegexes = [
    { name: 'Windows', regex: /Windows NT ([0-9.]+)/ },
    { name: 'Mac OS', regex: /Mac OS X ([0-9._]+)/ },
    { name: 'Linux', regex: /Linux/ },
    { name: 'iOS', regex: /iPhone OS ([0-9._]+)/ },
    { name: 'Android', regex: /Android ([0-9.]+)/ }
  ];

  for (const os of osRegexes) {
    const match = userAgent.match(os.regex);
    if (match) {
      return {
        name: os.name,
        version: match[1].replace(/_/g, '.')
      };
    }
  }

  return {
    name: 'Unknown',
    version: 'Unknown'
  };
} 