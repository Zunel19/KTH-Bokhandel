import Image from "next/image";
import SellPrompt from "./SellPrompt";

export default function Hero() {
  return (
    <section className="relative w-full h-[60vh] min-h-[420px] overflow-hidden">
      {/* Dekorativ bakgrundsbild, därför tom alt-text.
          Flytta bildens fokus genom att byta object-center mot t.ex.
          object-[50%_65%] (vågrätt % vertikalt %) för att visa mer av nederdelen. */}
      <Image
        src="/hero.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Sandfärgat lager så att texten går att läsa över fotot.
          Opacitet: /75 – testa mellan /60 (mer bild) och /90 (mer sand). */}
      <div className="absolute inset-0 bg-[var(--sand)]/55" aria-hidden="true" />

      {/* Mjuk övergång mot sandbakgrunden under hero. Höjd: h-24.
          Ta bort den här raden för en rak kant. */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--sand)] to-transparent"
        aria-hidden="true"
      />

      {/* pb-14: Justera detta för att flytta textblocket upp eller ned
          (blocket flyttas upp med halva värdet, pb-14 = 56px → 28px upp).
          Avstånd rubrik–rad: mb-3 på h1. Avstånd rad–sökfält: mt-16 på sökfältet.
          Ändras de avstånden, justera pb lika mycket åt andra hållet så att
          rubriken står kvar på samma plats. */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-14 text-center">
        <h1 className="mx-auto mb-3 max-w-3xl text-balance text-center font-serif text-4xl font-normal leading-tight tracking-tight text-[var(--navy)] md:text-5xl">
          Hitta din kurslitteratur på KTH
        </h1>

        <SellPrompt />

        <div className="mt-16 flex w-full max-w-xl gap-2">
          <input
            type="text"
            placeholder="Sök kurskod, titel eller författare..."
            className="flex-1 rounded-md border border-[var(--kth-blue)]/30 bg-white px-4 py-3 text-sm text-[var(--navy)] placeholder:text-[var(--navy)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]"
          />
          <button
            type="button"
            className="rounded-md bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]"
          >
            Sök
          </button>
        </div>
      </div>
    </section>
  );
}
