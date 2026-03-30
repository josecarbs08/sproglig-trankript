/**
 * Background Service Worker
 * Listen for shortcut commands and relay them to the active transcription tab.
 */
chrome.commands.onCommand.addListener((command) => {
  console.log('[Extension] Command received:', command);

  // Broaden searching to find any tab that might be running our app
  chrome.tabs.query({}, (tabs) => {
    // Filter manually for more robustness - check for keywords in URL
    const targetTabs = tabs.filter(t => t.url && (
      t.url.includes('localhost') || 
      t.url.includes('127.0.0.1') ||
      t.url.includes('vercel.app')
    ));
    
    if (targetTabs.length === 0) {
      console.warn('[Extension] No active transcription tab found.');
      return;
    }

    // Try to send to ALL matching tabs just in case
    targetTabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { command });
    });
  });
});
