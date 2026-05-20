// === Word definition lookup ===
//
// Fetches a brief English definition for a word from dictionaryapi.dev
// (free, no API key required). Caches results in-memory for the session
// so each word is fetched at most once per page load. Returns null when
// the word isn't in the dictionary (or the request fails) so the UI can
// quietly hide the definition row without blocking gameplay.

const cache = new Map();    // word (lowercase) → { definition, partOfSpeech } | null
const pending = new Map();  // word → Promise (dedupe in-flight requests)

const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";

export async function fetchWordDefinition(word) {
  if (!word || typeof word !== "string") return null;
  const key = word.toLowerCase().trim();
  if (!key) return null;

  if (cache.has(key)) return cache.get(key);
  if (pending.has(key)) return pending.get(key);

  const promise = (async () => {
    try {
      const res = await fetch(API_BASE + encodeURIComponent(key), {
        // Treat non-200s as "no definition found" rather than errors.
        // dictionaryapi returns 404 with a JSON body for unknown words.
      });
      if (!res.ok) {
        cache.set(key, null);
        return null;
      }
      const data = await res.json();
      // Shape: [{ word, meanings: [{ partOfSpeech, definitions: [{ definition, example }] }] }]
      const first = data?.[0]?.meanings?.[0];
      if (!first) {
        cache.set(key, null);
        return null;
      }
      const defText = first.definitions?.[0]?.definition || null;
      if (!defText) {
        cache.set(key, null);
        return null;
      }
      const result = {
        definition: defText,
        partOfSpeech: first.partOfSpeech || null,
      };
      cache.set(key, result);
      return result;
    } catch {
      // Network failure — don't cache so a retry next time could succeed.
      return null;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise);
  return promise;
}

// Synchronous read of cache. Returns:
//   undefined → not yet fetched
//   null      → fetched, no definition
//   object    → fetched, has { definition, partOfSpeech }
export function getCachedDefinition(word) {
  if (!word) return undefined;
  const key = word.toLowerCase().trim();
  return cache.has(key) ? cache.get(key) : undefined;
}
