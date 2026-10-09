"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ListingCard from "./ListingCard";

// Platshållarfärger som roteras tills annonser har riktiga bilder.
const PLACEHOLDER_COLORS = ["var(--kth-blue)", "var(--sky-blue)", "var(--navy)"];

export default function ListingsGrid() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchListings() {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, seller_id, created_at, profiles(username)")
        .eq("status", "till salu")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        console.error("Kunde inte hämta annonser:", error);
        setError("Kunde inte hämta annonser just nu.");
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
