import ListingCard from "./ListingCard";

// Mock-data tills listings kopplas mot Supabase
const MOCK_LISTINGS = [
  { id: 1, title: "Endimensionell analys - Persson & Böiers", price: 250, seller: "anna.k", placeholderColor: "var(--kth-blue)" },
  { id: 2, title: "Flervariabelanalys - Persson & Böiers", price: 220, seller: "erik92", placeholderColor: "var(--sky-blue)" },
  { id: 3, title: "Diskret matematik - Grimaldi", price: 180, seller: "mariaS", placeholderColor: "var(--navy)" },
  { id: 4, title: "Linjär algebra - Sparr", price: 200, seller: "johan_l", placeholderColor: "var(--kth-blue)" },
  { id: 5, title: "Mekanik - Målqvist", price: 150, seller: "sofia.p", placeholderColor: "var(--sky-blue)" },
  { id: 6, title: "Elektromagnetism - Griffiths", price: 300, seller: "victor99", placeholderColor: "var(--navy)" },
];

export default function ListingsGrid() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-2 pb-10 sm:px-8">
      <h2 className="mb-6 text-xl font-medium text-[var(--navy)]">Senast tillagda</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_LISTINGS.map((listing) => (
          <ListingCard key={listing.id} {...listing} />
        ))}
      </div>
    </section>
  );
}
