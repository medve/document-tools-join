import { trackEvent, trackError } from '../src/lib/amplitude';

// Global error handler for background script
chrome.runtime.onError.addListener((error) => {
  trackError(error, {
    context: 'background_script'
  });
});

chrome.action.onClicked.addListener((tab) => {
  try {
    trackEvent('toolbar_clicked', {
      tabId: tab.id,
      url: tab.url
    });
    chrome.tabs.create({ url: "index.html" });
  } catch (error) {
    trackError(error, {
      context: 'toolbar_click',
      tabId: tab.id
    });
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  try {
    if (details.reason === "install") {
      trackEvent('extension_installed', {
        version: chrome.runtime.getManifest().version
      });
      chrome.tabs.create({ url: "https://pdfjoiner.app/welcome" });
    }
  } catch (error) {
    trackError(error, {
      context: 'extension_install',
      reason: details.reason
    });
  }
});

// Track when extension is opened
chrome.runtime.onStartup.addListener(() => {
  try {
    trackEvent('extension_opened', {
      version: chrome.runtime.getManifest().version
    });
  } catch (error) {
    trackError(error, {
      context: 'extension_startup'
    });
  }
});