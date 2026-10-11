"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";

export default function ListingCard({ listing, placeholderColor }) {
  const username = listing.profiles?.username ?? "Okänd";
  // Sorterade efter position, lägst först.
  const images = [...(listing.listing_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => image.thumb_url || image.image_url)
    .filter(Boolean);

  // selected: senast klickade bilden. preview: bilden under muspekaren.
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState(null);
  // Övriga bilder hämtas först när någon interagerar med kortet.
  const [loadAll, setLoadAll] = useState(false);
  const shown = preview ?? selected;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Bilderna om annonsen har några, annars en färgad platshållare. */}
      <div
        className="group relative aspect-square w-full overflow-hidden"
        style={{ backgroundColor: placeholderColor }}
        onPointerEnter={() => images.length > 1 && setLoadAll(true)}
      >
        {images.map((src, index) =>
          index === 0 || loadAll ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={
                index === 0
                  ? listing.title
                  : `${listing.title} (bild ${index + 1})`
              }
              aria-hidden={index === shown ? undefined : "true"}
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
                index === shown ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null
        )}

        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <div className="flex items-center rounded-full bg-black/30 px-1.5 py-0.5 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-has-[:focus-visible]:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Visa bild ${index + 1} av ${images.length}`}
                  aria-current={index === selected ? true : undefined}
                  onMouseEnter={() => setPreview(index)}
                  onMouseLeave={() => setPreview(null)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelected(index);
                    setLoadAll(true);
                  }}
                  className="rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span
                    className={`block h-2 w-2 rounded-full transition-colors ${
                      index === shown ? "bg-white" : "bg-white/50"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm font-medium text-[var(--navy)]">{listing.title}</p>
        <p className="font-bold text-[var(--kth-blue)]">{`${listing.price} kr`}</p>
        <div className="flex items-center gap-1.5">
          <Avatar seed={listing.seller_id} name={username} size={20} />
          <p className="text-xs text-gray-500">{username}</p>
        </div>
      </div>
    </div>
  );
}
