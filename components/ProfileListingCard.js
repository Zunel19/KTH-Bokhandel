"use client";

import Link from "next/link";
import { postedAgo } from "@/lib/relativeTime";
import CardImageCarousel from "@/components/CardImageCarousel";
import ListingMenu from "@/components/ListingMenu";

export default function ProfileListingCard({
  listing,
  busy,
  onToggleSold,
  onDelete,
}) {
  const isSold = listing.status === "såld";
  const bookCount = listing.listing_items?.length ?? 0;

  return (
    <div className={`relative ${busy ? "pointer-events-none opacity-60" : ""}`}>
      <Link
        href={`/annons/${listing.id}`}
        className="block overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)]"
      >
        <CardImageCarousel
          images={listing.listing_images}
          title={listing.title}
          imagesClassName={`bg-[var(--kth-blue)]/10 ${isSold ? "opacity-70" : ""}`}
        >
          {(isSold || bookCount >= 2) && (
            <div className="pointer-events-none absolute left-2 top-2 z-[1] flex flex-col items-start gap-1">
              {isSold && (
                <span className="rounded-full bg-[var(--navy)] px-2 py-0.5 text-xs font-medium text-white">
                  Såld
                </span>
              )}
              {bookCount >= 2 && (
                <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-[var(--kth-blue)]">
                  {`Bundle · ${bookCount} böcker`}
                </span>
              )}
            </div>
          )}
        </CardImageCarousel>
        <div className={`flex flex-col gap-1 p-3 ${isSold ? "opacity-70" : ""}`}>
          <p className="line-clamp-2 text-sm font-medium text-[var(--navy)]">
            {listing.title}
          </p>
          <p className="font-semibold text-[var(--kth-blue)]">{`${listing.price} kr`}</p>
          <p className="text-xs text-gray-500">
            Upplagd {postedAgo(listing.created_at)}
          </p>
        </div>
      </Link>

      <ListingMenu
        className="absolute right-2 top-2"
        title={listing.title}
        status={listing.status}
        viewHref={`/annons/${listing.id}`}
        busy={busy}
        onToggleSold={onToggleSold}
        onDelete={onDelete}
      />
    </div>
  );
}
