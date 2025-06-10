chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL('index.html');
  chrome.tabs.create({ url });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://pdfjoiner.app/welcome" });
  }
});

const UNINSTALL_URL = "https://pdfjoiner.app/uninstall";
chrome.runtime.setUninstallURL(UNINSTALL_URL);
