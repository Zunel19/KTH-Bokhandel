"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { hasHomeState } from "@/lib/homeState";

// Går tillbaka i historiken om man kom från startsidan, så att den kan
// återställa scrollpositionen. Annars en vanlig länk till startsidan.
export default function BackLink() {
  const router = useRouter();

  function handleClick(e) {
    // Låt ctrl/cmd/shift-klick öppna i ny flik eller nytt fönster som vanligt.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    if (hasHomeState() && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--navy)] transition-colors hover:text-[var(--kth-blue)] hover:underline"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M17 10a.75.75 0 0 1-.75.75H5.56l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 1 1 1.06 1.06L5.56 9.25H16.25A.75.75 0 0 1 17 10Z"
          clipRule="evenodd"
        />
      </svg>
      Tillbaka
    </Link>
  );
}
