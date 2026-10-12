"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import CardImageCarousel from "@/components/CardImageCarousel";

export default function ListingCard({ listing, placeholderColor }) {
  const username = listing.profiles?.username ?? "Okänd";
  const bookCount = listing.listing_items?.length ?? 0;

  return (
    <Link
      href={`/annons/${listing.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)]"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardImageCarousel
          images={listing.listing_images}
          title={listing.title}
          style={{ backgroundColor: placeholderColor }}
        >
          {bookCount >= 2 && (
            <span className="pointer-events-none absolute left-2 top-2 z-[1] rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-[var(--kth-blue)]">
              {`Bundle · ${bookCount} böcker`}
            </span>
          )}
        </CardImageCarousel>
        <div className="flex flex-col gap-1 p-4">
          <p className="text-sm font-medium text-[var(--navy)]">
            {listing.title}
          </p>
          <p className="font-bold text-[var(--kth-blue)]">{`${listing.price} kr`}</p>
          <div className="flex items-center gap-1.5">
            <Avatar seed={listing.seller_id} name={username} size={20} />
            <p className="text-xs text-gray-500">{username}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
