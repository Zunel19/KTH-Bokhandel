"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  saveHomeState,
  loadHomeState,
  clearHomeState,
  consumeReturning,
} from "@/lib/homeState";
import ListingCard from "./ListingCard";

// Platshållarfärger som roteras tills annonser har riktiga bilder.
const PLACEHOLDER_COLORS = ["var(--kth-blue)", "var(--sky-blue)", "var(--navy)"];

export default function ListingsGrid() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Scrollposition att återställa efter att sparade annonser renderats.
  const [restoreY, setRestoreY] = useState(null);
  const initializedRef = useRef(false);
  const restoredRef = useRef(false);

  // Vid tillbaka-navigering: visa sparade annonser direkt, så att sidan har
  // rätt höjd och scrollpositionen kan återställas. Läses i en effekt för att
  // undvika hydreringsfel. Ref:en skyddar mot dubbelkörning i Strict Mode.
  useLayoutEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const saved = consumeReturning() ? loadHomeState() : null;
    if (saved?.listings?.length) {
      restoredRef.current = true;
      // Avsiktligt: sessionStorage kan inte läsas under rendering (servern
      // har den inte), och det ska ske före första målningen.
      /* eslint-disable react-hooks/set-state-in-effect */
      setListings(saved.listings);
      setLoading(false);
      setRestoreY(saved.scrollY ?? 0);
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      clearHomeState();
    }
  }, []);

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

  useEffect(() => {
    async function fetchListings() {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, seller_id, created_at, profiles(username), listing_images(image_url, thumb_url, position), listing_items(id)"
        )
        .eq("status", "till salu")
        .order("created_at", { ascending: false })
        .order("position", { referencedTable: "listing_images", ascending: true })
        .limit(8);

      if (error) {
        console.error("Kunde inte hämta annonser:", error);
        // Visas sparade annonser redan behålls de i stället för ett felmeddelande.
        if (!restoredRef.current) {
          setError("Kunde inte hämta annonser just nu.");
        }
      } else {
        setListings(data);
      }
      setLoading(false);
    }

    fetchListings();
  }, []);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-2 pb-10 sm:px-8">
      <h2 className="mb-6 text-xl font-medium text-[var(--navy)]">Senast tillagda</h2>

      {loading ? (
        <p className="text-sm text-gray-500">Laddar annonser...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : listings.length === 0 ? (
        <p className="text-sm text-gray-500">
          Inga annonser än. Bli först med att{" "}
          <Link href="/skapa-annons" className="text-[var(--kth-blue)] hover:underline">
            lägga upp en
          </Link>
          !
        </p>
      ) : (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          onClickCapture={() =>
            saveHomeState({ listings, scrollY: window.scrollY })
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
      )}
    </section>
  );
}
