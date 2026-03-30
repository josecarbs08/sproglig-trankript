/**
 * Content Script
 * Bridging message from Extension Background to the Web Page.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command) {
    // Relay the command to the main page script via postMessage
    window.postMessage({
      source: 'klasse-transkript-extension',
      command: request.command
    }, '*');
  }

  // Handle ping for connectivity check
  if (request.action === 'ping') {
    sendResponse({ status: 'active' });
    window.postMessage({
      source: 'klasse-transkript-extension',
      action: 'pong'
    }, '*');
  }
});
