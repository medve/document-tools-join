/** @type {{ deviceId?: string; sessionId?: string } | undefined} */
let cachedAmpIds;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AMP_IDS') cachedAmpIds = msg;
});

chrome.action.onClicked.addListener(() => {
  const base = chrome.runtime.getURL('index.html');

  const url = cachedAmpIds
    ? `${base}?ampDeviceId=${encodeURIComponent(cachedAmpIds.deviceId)}&ampSessionId=${cachedAmpIds.sessionId}`
    : base;                       // fallback if we never got the IDs

  chrome.tabs.create({ url });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://pdfjoiner.app/welcome" });
  }
});

const UNINSTALL_URL = "https://pdfjoiner.app/uninstall";
chrome.runtime.setUninstallURL(UNINSTALL_URL);
