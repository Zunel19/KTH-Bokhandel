import Avatar from "@/components/Avatar";

export default function ListingCard({ listing, placeholderColor }) {
  const username = listing.profiles?.username ?? "Okänd";
  // Huvudbilden är den med lägst position.
  const mainImage = [...(listing.listing_images ?? [])].sort(
    (a, b) => a.position - b.position
  )[0];
  const imageSrc = mainImage?.thumb_url || mainImage?.image_url;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Huvudbilden om annonsen har bilder, annars en färgad platshållare. */}
      <div
        className="aspect-square w-full"
        style={{ backgroundColor: placeholderColor }}
      >
        {imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={listing.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
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
