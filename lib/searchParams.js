// Sökning och filter för startsidan, lagrade i adressens sökparametrar:
// q, kurs, program, ar, skick (kommaseparerat: ny,nyskick,anvant), min, max
// och sort (nyast, pris-asc, pris-desc).

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONDITIONS = {
  ny: "Ny",
  nyskick: "Nyskick",
  anvant: "Använt skick",
};

const SORTS = ["nyast", "pris-asc", "pris-desc"];
const DEFAULT_SORT = "nyast";
const MAX_QUERY_LENGTH = 100;

function readUuid(value) {
  return value && UUID_RE.test(value) ? value.toLowerCase() : null;
}

function readPrice(value) {
  if (value === null || value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// searchParams: URLSearchParams eller Next.js ReadonlyURLSearchParams.
export function parseFilters(searchParams) {
  const get = (key) => searchParams?.get(key) ?? null;

  const q = (get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH) || null;

  const yearNumber = Number(get("ar"));
  const ar =
    Number.isInteger(yearNumber) && yearNumber >= 1 && yearNumber <= 6
      ? yearNumber
      : null;

  const skick = [
    ...new Set(
      (get("skick") ?? "")
        .split(",")
        .map((code) => code.trim().toLowerCase())
        .filter((code) => code in CONDITIONS)
    ),
  ];

  const sort = SORTS.includes(get("sort")) ? get("sort") : DEFAULT_SORT;

  return {
    q,
    kurs: readUuid(get("kurs")),
    program: readUuid(get("program")),
    ar,
    skick,
    min: readPrice(get("min")),
    max: readPrice(get("max")),
    sort,
  };
}

// Bygger en query-string utan standardvärden, t.ex. "q=sf1625&sort=pris-asc".
export function buildQueryString(filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.kurs) params.set("kurs", filters.kurs);
  if (filters.program) params.set("program", filters.program);
  if (filters.ar) params.set("ar", String(filters.ar));
  if (filters.skick?.length) params.set("skick", filters.skick.join(","));
  if (filters.min !== null && filters.min !== undefined) {
    params.set("min", String(filters.min));
  }
  if (filters.max !== null && filters.max !== undefined) {
    params.set("max", String(filters.max));
  }
  if (filters.sort && filters.sort !== DEFAULT_SORT) {
    params.set("sort", filters.sort);
  }
  // Kommatecken behöver inte kodas, och "skick=ny,anvant" är lättare att läsa.
  return params.toString().replace(/%2C/gi, ",");
}

// Argument till SQL-funktionen search_listings. Osatta nycklar utelämnas.
export function toRpcArgs(filters) {
  const args = {};
  if (filters.q) args.p_q = filters.q;
  if (filters.kurs) args.p_course_id = filters.kurs;
  if (filters.program) args.p_program_id = filters.program;
  if (filters.ar) args.p_year = filters.ar;
  if (filters.skick?.length) {
    args.p_conditions = filters.skick.map((code) => CONDITIONS[code]);
  }
  if (filters.min !== null && filters.min !== undefined) {
    args.p_min_price = filters.min;
  }
  if (filters.max !== null && filters.max !== undefined) {
    args.p_max_price = filters.max;
  }
  return args;
}

// Sant om något annat än sorteringen är satt.
export function hasActiveFilters(filters) {
  return Boolean(
    filters.q ||
      filters.kurs ||
      filters.program ||
      filters.ar ||
      filters.skick?.length ||
      (filters.min !== null && filters.min !== undefined) ||
      (filters.max !== null && filters.max !== undefined)
  );
}
