"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  saveHomeState,
  loadHomeState,
  clearHomeState,
  consumeReturning,
} from "@/lib/homeState";
import {
  parseFilters,
  buildQueryString,
  toRpcArgs,
  hasActiveFilters,
} from "@/lib/searchParams";
import ListingCard from "./ListingCard";

// Antal annonser per sida, sänk tillfälligt för att testa Visa fler.
const PAGE_SIZE = 12;

// Platshållarfärger som roteras tills annonser har riktiga bilder.
const PLACEHOLDER_COLORS = ["var(--kth-blue)", "var(--sky-blue)", "var(--navy)"];

const SELECT =
  "id, title, price, seller_id, created_at, profiles(username), listing_images(image_url, thumb_url, position), listing_items(id)";

function fetchListings(filters, from, to) {
  let query = supabase
    .rpc("search_listings", toRpcArgs(filters), { count: "exact" })
    .select(SELECT);

  if (filters.sort === "nyast") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query
      .order("price", { ascending: filters.sort === "pris-asc" })
      .order("created_at", { ascending: false });
  }

  return query
    .order("position", { referencedTable: "listing_images", ascending: true })
    .range(from, to);
}

export default function ListingsGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);
  // Nyckeln för den aktuella sökningen: query-stringen utan standardvärden.
  const key = buildQueryString(filters);
  const active = hasActiveFilters(filters);

  const [listings, setListings] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(null);
  // Scrollposition att återställa efter att sparade annonser renderats.
  const [restoreY, setRestoreY] = useState(null);

  const initializedRef = useRef(false);
  // Nyckeln för ett återställt läge, eller null om inget återställdes.
  const restoredKeyRef = useRef(null);
  const currentKeyRef = useRef(key);

  // Ny sökning: töm listan och visa laddning direkt (justeras under
  // renderingen i stället för i en effekt).
  const [shownKey, setShownKey] = useState(key);
  if (key !== shownKey) {
    setShownKey(key);
    setListings([]);
    setCount(null);
    setLoading(true);
    setError(null);
    setMoreError(null);
    setLoadingMore(false);
  }

  // Vid tillbaka-navigering: visa sparade annonser direkt, så att sidan har
  // rätt höjd och scrollpositionen kan återställas. Bara om det sparade läget
  // gäller samma sökning som adressen. Läses i en effekt för att undvika
  // hydreringsfel. Ref:en skyddar mot dubbelkörning i Strict Mode.
  useLayoutEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const saved = consumeReturning() ? loadHomeState() : null;
    if (saved?.key === key && saved.listings?.length) {
      restoredKeyRef.current = key;
      // Avsiktligt: sessionStorage kan inte läsas under rendering (servern
      // har den inte), och det ska ske före första målningen.
      /* eslint-disable react-hooks/set-state-in-effect */
      setListings(saved.listings);
      setCount(saved.count ?? null);
      setLoading(false);
      setRestoreY(saved.scrollY ?? 0);
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      clearHomeState();
    }
  }, [key]);

  // Next.js kan scrolla till toppen efter monteringen, så upprepa.
  useLayoutEffect(() => {
    if (restoreY === null) return;
    const y = restoreY;
    window.scrollTo(0, y);
    const frame = requestAnimationFrame(() => window.scrollTo(0, y));
    const timer = setTimeout(() => window.scrollTo(0, y), 60);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [restoreY]);

  // Hämta första sidan när sökningen ändras. Äldre svar ignoreras.
  useEffect(() => {
    let cancelled = false;
    currentKeyRef.current = key;

    // Ett återställt läge uppdateras i bakgrunden med lika många annonser
    // som visas, utan laddningstillstånd.
    // Ref:en nollas först när sökningen byts, så att en dubbelkörning i
    // Strict Mode också ser att läget återställdes.
    const restored = restoredKeyRef.current === key;
    if (!restored) restoredKeyRef.current = null;
    const restoredCount = restored ? loadHomeState()?.listings?.length ?? 0 : 0;
    const to = Math.max(restoredCount, PAGE_SIZE) - 1;

    async function load() {
      const { data, error, count } = await fetchListings(
        parseFilters(new URLSearchParams(key)),
        0,
        to
      );
      if (cancelled) return;

      if (error) {
        console.error("Kunde inte hämta annonser:", error);
        // Visas sparade annonser redan behålls de i stället för ett felmeddelande.
        if (!restored) setError("Kunde inte hämta annonser just nu.");
      } else {
        setListings(data);
        setCount(count ?? null);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  async function handleLoadMore() {
    const requestKey = key;
    const from = listings.length;
    setLoadingMore(true);
    setMoreError(null);

    const { data, error, count } = await fetchListings(
      filters,
      from,
      from + PAGE_SIZE - 1
    );
    // Sökningen har bytts under tiden: släng svaret.
    if (currentKeyRef.current !== requestKey) return;

    if (error) {
      console.error("Kunde inte hämta fler annonser:", error);
      setMoreError("Kunde inte hämta fler annonser just nu.");
    } else {
      setListings((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        return [...prev, ...data.filter((l) => !seen.has(l.id))];
      });
      if (count !== null && count !== undefined) setCount(count);
    }
    setLoadingMore(false);
  }

  // Tar bort sökord och alla filter men behåller sorteringen.
  function clearFilters() {
    const queryString = buildQueryString({ sort: filters.sort });
    router.replace(queryString ? `/?${queryString}` : "/", { scroll: false });
  }

  const hasMore = count !== null && listings.length < count;

  let heading = "Senast tillagda";
  if (active) {
    if (count === null) {
      heading = "Söker...";
    } else {
      heading = `${count} ${count === 1 ? "annons" : "annonser"}`;
      if (filters.q) heading += ` för ”${filters.q}”`;
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-2 pb-10 sm:px-8">
      <div
        aria-live="polite"
        className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
      >
        <h2
          id="resultat"
          className="scroll-mt-24 text-xl font-medium text-[var(--navy)]"
        >
          {heading}
        </h2>
        {active && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-[var(--kth-blue)] hover:underline"
          >
            Rensa filter
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Laddar annonser...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : listings.length === 0 ? (
        active ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-gray-500">
              Inga annonser matchade din sökning.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-[var(--sky-blue)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--kth-blue)] transition-colors hover:bg-[var(--sky-blue)]/10"
            >
              Rensa filter
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Inga annonser än. Bli först med att{" "}
            <Link href="/skapa-annons" className="text-[var(--kth-blue)] hover:underline">
              lägga upp en
            </Link>
            !
          </p>
        )
      ) : (
        <>
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            onClickCapture={() =>
              saveHomeState({ key, listings, count, scrollY: window.scrollY })
            }
          >
            {listings.map((listing, index) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                placeholderColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
              />
            ))}
          </div>

          {(hasMore || moreError) && (
            <div className="mt-8 flex flex-col items-center gap-2">
              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-[var(--sky-blue)] bg-transparent px-6 py-2.5 text-sm font-medium text-[var(--kth-blue)] transition-colors hover:bg-[var(--sky-blue)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? "Laddar..." : "Visa fler"}
                </button>
              )}
              {moreError && (
                <p className="text-sm text-red-600" role="alert">
                  {moreError}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
