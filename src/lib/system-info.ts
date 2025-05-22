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
  
  if (!isBrowser) {
    // Return default values for server-side
    return {
      browser_locale: 'en-US',
      browser_name: 'Unknown',
      browser_version: 'Unknown',
      os_name: 'Unknown',
      os_version: 'Unknown',
      screen_resolution: '0x0',
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
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    color_scheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
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