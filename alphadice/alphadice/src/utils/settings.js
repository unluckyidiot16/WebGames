// === Settings ===
//
// Lightweight preference store backed by localStorage. Used for non-gameplay
// toggles that should persist across runs (vs. per-run state which lives
// in the zustand store).
//
// Current keys:
//   autoSkipEmptyTurn (bool, default false) — when true, the game ends the
//     player's turn automatically if no skill is castable. Default OFF for
//     MVP — implementing the "no skill castable" check correctly is fiddly
//     (cooldowns, conditions, slot ranges, etc.) and getting it wrong would
//     auto-end perfectly playable turns. We expose the toggle so the UI can
//     show it as a planned feature.

const KEY = "alphadice.settings.v1";

const defaults = {
  autoSkipEmptyTurn: false,
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function getSetting(key) {
  return getSettings()[key];
}

export function updateSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}
