import Avatar from "@/components/Avatar";

export default function ListingCard({ listing, placeholderColor }) {
  const username = listing.profiles?.username ?? "Okänd";

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Platshållare tills bilder sparas. Här ska första bilden från
          listing_images visas när den tabellen används. */}
      <div
        className="aspect-square w-full"
        style={{ backgroundColor: placeholderColor }}
      />
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
