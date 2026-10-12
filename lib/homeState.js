// Sparar startsidans annonser och scrollposition i sessionStorage, så att
// man hamnar på samma ställe när man går tillbaka från en annons.
// Allt körs bara i webbläsaren och misslyckas tyst (t.ex. privat läge).

const HOME_KEY = "kthb:home";
const RETURNING_KEY = "kthb:returning";
const RETURNING_MAX_AGE_MS = 3000;

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveHomeState({ listings, scrollY }) {
  try {
    storage()?.setItem(HOME_KEY, JSON.stringify({ listings, scrollY }));
  } catch {
    // Fullt eller blockerat: hoppa över.
  }
}

export function loadHomeState() {
  try {
    const raw = storage()?.getItem(HOME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasHomeState() {
  try {
    return Boolean(storage()?.getItem(HOME_KEY));
  } catch {
    return false;
  }
}

export function clearHomeState() {
  try {
    storage()?.removeItem(HOME_KEY);
  } catch {
    // Ignorera.
  }
}

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
