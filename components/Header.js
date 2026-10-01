import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-[var(--sand)] border-b border-[var(--kth-blue)]/20">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-[var(--navy)]">KTH Bokhandel</span>

          {/* Tillfällig länk tills profilsidan finns */}
          <Link
            href="/skapa-annons"
            className="rounded-full bg-[var(--kth-blue)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]"
          >
            Skapa din första annons
          </Link>
        </div>

        <button
          type="button"
          aria-label="Min profil"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[var(--kth-blue)]/30 text-[var(--kth-blue)] hover:bg-[var(--kth-blue)]/5 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
