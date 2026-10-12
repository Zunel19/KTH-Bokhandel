// Sparar sidors läge (annonser och scrollposition) i sessionStorage, så att
// man hamnar på samma ställe när man går tillbaka från en annons.
// Allt körs bara i webbläsaren och misslyckas tyst (t.ex. privat läge).

const HOME_KEY = "kthb:home";
const RETURNING_KEY = "kthb:returning";
const NAV_COUNT_KEY = "kthb:navCount";
const RETURNING_MAX_AGE_MS = 3000;

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// Generella funktioner för valfri sida.

export function savePageState(key, data) {
  try {
    storage()?.setItem(key, JSON.stringify(data));
  } catch {
    // Fullt eller blockerat: hoppa över.
  }
}

export function loadPageState(key) {
  try {
    const raw = storage()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPageState(key) {
  try {
    storage()?.removeItem(key);
  } catch {
    // Ignorera.
  }
}

// Startsidan.

export function saveHomeState({ listings, scrollY }) {
  savePageState(HOME_KEY, { listings, scrollY });
}

export function loadHomeState() {
  return loadPageState(HOME_KEY);
}

export function clearHomeState() {
  clearPageState(HOME_KEY);
}

// Gemensamt: tillbaka/framåt-navigering.

// Anropas vid popstate (webbläsarens tillbaka/framåt).
export function markReturning() {
  try {
    storage()?.setItem(RETURNING_KEY, String(Date.now()));
  } catch {
    // Ignorera.
  }
}

// Sant om en tillbaka/framåt-navigering skedde nyss. Läser bara en gång.
export function consumeReturning() {
  try {
    const s = storage();
    const raw = s?.getItem(RETURNING_KEY);
    s?.removeItem(RETURNING_KEY);
    return raw ? Date.now() - Number(raw) < RETURNING_MAX_AGE_MS : false;
  } catch {
    return false;
  }
}

// Antal sidbyten inom appen i den här fliken.

export function incrementNavCount() {
  try {
    const s = storage();
    s?.setItem(NAV_COUNT_KEY, String(Number(s.getItem(NAV_COUNT_KEY) ?? 0) + 1));
  } catch {
    // Ignorera.
  }
}

export function getNavCount() {
  try {
    return Number(storage()?.getItem(NAV_COUNT_KEY) ?? 0);
  } catch {
    return 0;
  }
}
