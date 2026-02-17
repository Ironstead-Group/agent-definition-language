// Prevent cross-tab color mode synchronization.
// Each browser tab maintains its own independent dark/light mode choice,
// following the Apple HIG per-window appearance model.
//
// How it works: Docusaurus listens for 'storage' events on the 'theme' key
// to sync color mode across tabs. This capture-phase listener intercepts
// those events before they reach Docusaurus's bubble-phase handler.
//
// Safe to block because setColorMode() updates React state and DOM attributes
// directly — the storage listener is redundant for same-tab and unwanted
// for cross-tab.

if (typeof window !== 'undefined') {
  window.addEventListener(
    'storage',
    (e: StorageEvent) => {
      if (e.key === 'theme') {
        e.stopImmediatePropagation();
      }
    },
    true, // capture phase — runs before Docusaurus's bubble-phase listener
  );
}
