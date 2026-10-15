import { Suspense } from "react";
import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";
import ListingsGrid from "@/components/ListingsGrid";

export default function Home() {
  return (
    <main className="flex-1 bg-[var(--sand)]">
      {/* Komponenter som läser sökparametrarna med useSearchParams måste
          ligga i en Suspense-gräns. En gräns var, så att en del som väntar
          inte döljer de andra. */}
      <Suspense fallback={null}>
        <Hero />
      </Suspense>
      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>
      <Suspense fallback={null}>
        <ListingsGrid />
      </Suspense>
    </main>
  );
}
