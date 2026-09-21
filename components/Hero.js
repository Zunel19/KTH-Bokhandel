export default function Hero() {
  return (
    <section className="relative w-full h-[60vh] min-h-[420px] overflow-hidden">
      {/* Bildplatshållare: byt ut mot en riktig bild senare, t.ex.
          <Image src="/hero.jpg" alt="Studenter med kurslitteratur" fill className="object-cover" priority /> */}
      <div className="absolute inset-0 bg-[var(--kth-blue)]/10" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="max-w-2xl font-serif text-4xl text-[var(--navy)] sm:text-5xl">
          Hitta din kurslitteratur på KTH
        </h1>

        <div className="flex w-full max-w-xl gap-2">
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
