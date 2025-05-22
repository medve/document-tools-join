/// <reference types="chrome"/>

export interface SystemInfo {
  extension_version: string;
  browser_locale: string;
  browser_name: string;
  browser_version: string;
  os_name: string;
  os_version: string;
  screen_resolution: string;
  color_scheme: 'light' | 'dark';
}

export function getSystemInfo(): SystemInfo {
  const userAgent = navigator.userAgent;
  const browserInfo = getBrowserInfo(userAgent);
  const osInfo = getOSInfo(userAgent);

  return {
    extension_version: chrome.runtime.getManifest().version,
    browser_locale: navigator.language,
    browser_name: browserInfo.name,
    browser_version: browserInfo.version,
    os_name: osInfo.name,
    os_version: osInfo.version,
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    color_scheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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