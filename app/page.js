import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";
import ListingsGrid from "@/components/ListingsGrid";

export default function Home() {
  return (
    <main className="flex-1 bg-[var(--sand)]">
      <Hero />
      <FilterBar />
      <ListingsGrid />
    </main>
  );
}
