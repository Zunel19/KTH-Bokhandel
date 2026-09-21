export default function ListingCard({ title, price, seller, placeholderColor }) {
  return (
    <div className="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div
        className="aspect-square w-full"
        style={{ backgroundColor: placeholderColor }}
      />
      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm font-medium text-[var(--navy)]">{title}</p>
        <p className="font-bold text-[var(--kth-blue)]">{price} kr</p>
        <p className="text-xs text-gray-500">{seller}</p>
      </div>
    </div>
  );
}
