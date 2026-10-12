import Link from "next/link";

export default function AnnonsNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--sand)] px-6 py-12 text-center">
      <h1 className="mb-3 font-serif text-3xl text-[var(--navy)]">
        Annonsen finns inte
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Den kan ha tagits bort, eller så stämmer inte länken.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]"
      >
        Till startsidan
      </Link>
    </main>
  );
}
