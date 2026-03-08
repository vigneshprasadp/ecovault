// background.js - Service Worker handling logic for EchoVault Guard
chrome.runtime.onInstalled.addListener(() => {
    console.log("EchoVault Guard installed.");
});

// Intercept requests if needed
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        const url = new URL(details.url);
        if (url.hostname.endsWith(".onion")) {
            console.log("Dark Web site detected:", url.hostname);
            // Will flag to backend API
        }
    },
    { urls: ["<all_urls>"] }
);
