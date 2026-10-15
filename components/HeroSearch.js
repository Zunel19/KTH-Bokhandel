"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseFilters, buildQueryString } from "@/lib/searchParams";

const INPUT_CLASSES =
  "w-full rounded-md border border-[var(--kth-blue)]/30 bg-white py-3 pl-4 pr-10 text-sm text-[var(--navy)] placeholder:text-[var(--navy)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";
const BUTTON_CLASSES =
  "rounded-md bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]";
const PLACEHOLDER = "Sök kurskod, titel eller ISBN...";

// Visas medan sökparametrarna läses in, så att hero inte hoppar.
export function HeroSearchFallback() {
  return (
    <div className="mt-16 flex w-full max-w-xl gap-2">
      <div className="relative flex-1">
        <input
          type="search"
          placeholder={PLACEHOLDER}
          className={INPUT_CLASSES}
          readOnly
          aria-label="Sök annonser"
        />
      </div>
      <button type="button" className={BUTTON_CLASSES}>
        Sök
      </button>
    </div>
  );
}

export default function HeroSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [value, setValue] = useState(urlQuery);
  // Håll fältet i synk när adressen ändras (t.ex. vid bakåt).
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setValue(urlQuery);
  }

  function navigate(q) {
    const filters = { ...parseFilters(searchParams), q: q || null };
    const queryString = buildQueryString(filters);
    router.replace(queryString ? `/?${queryString}` : "/", { scroll: false });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const q = value.trim();
    setValue(q);
    navigate(q);
    requestAnimationFrame(() => {
      document
        .getElementById("resultat")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleClear() {
    setValue("");
    navigate("");
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="mt-16 flex w-full max-w-xl gap-2"
    >
      <div className="relative flex-1">
        <input
          type="text"
          name="q"
          placeholder={PLACEHOLDER}
          aria-label="Sök annonser"
          maxLength={100}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={INPUT_CLASSES}
        />
        {value && (
          <button
            type="button"
            aria-label="Rensa sökning"
            onClick={handleClear}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs text-[var(--navy)]/60 transition-colors hover:bg-[var(--sky-blue)]/10 hover:text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)]"
          >
            ✕
          </button>
        )}
      </div>
      <button type="submit" className={BUTTON_CLASSES}>
        Sök
      </button>
    </form>
  );
}
