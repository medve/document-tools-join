chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: "index.html" });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://pdfjoiner.app/welcome" });
  }
});
