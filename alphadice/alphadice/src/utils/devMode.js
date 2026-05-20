// === Dev mode activation ===
//
// Dev mode is enabled by visiting the app with either:
//   ?dev=1   (query param)
//   #dev     (hash fragment)
//
// Once enabled it persists in localStorage so refreshes don't lose it.
// To disable: visit with ?dev=0 (or clear localStorage manually).
//
// The mode is NOT secret — anyone who knows the URL trick can enable it.
// That's by design for testing/sharing; if you need real secrecy use a
// password gate instead.

const KEY = "alphadice.devMode.v1";

export function isDevModeEnabled() {
  // Check URL flags first — they override the persisted value so you can
  // explicitly turn dev off (?dev=0) without clearing localStorage.
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const queryFlag = params.get("dev");
    if (queryFlag === "1") {
      localStorage.setItem(KEY, "1");
      return true;
    }
    if (queryFlag === "0") {
      localStorage.removeItem(KEY);
      return false;
    }
    if (window.location.hash === "#dev") {
      localStorage.setItem(KEY, "1");
      return true;
    }
  }
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function disableDevMode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
