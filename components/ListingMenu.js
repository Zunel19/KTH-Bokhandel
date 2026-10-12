"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const MENU_ITEM_CLASSES =
  "block w-full px-4 py-2 text-left text-sm text-[var(--navy)] hover:bg-[var(--sky-blue)]/10 focus:bg-[var(--sky-blue)]/10 focus:outline-none";

// Meny med tre prickar för en annons ägare.
// className: placering av menyn (t.ex. absolut över ett kort).
// viewHref: visar "Visa annons" om den finns.
export default function ListingMenu({
  title,
  status,
  onToggleSold,
  onDelete,
  viewHref,
  busy,
  className = "relative",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const isSold = status === "såld";

  function enabledItems() {
    return Array.from(
      menuRef.current?.querySelectorAll(
        '[role="menuitem"]:not([aria-disabled="true"])'
      ) ?? []
    );
  }

  // Fokus till första aktiva alternativet när menyn öppnas.
  useEffect(() => {
    if (open) enabledItems()[0]?.focus();
  }, [open]);

  // Stäng vid klick utanför. Ett klick på en annan menys knapp räknas också
  // som utanför, så bara en meny är öppen åt gången.
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function handleMenuKeyDown(e) {
    const items = enabledItems();
    const current = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  function choose(action) {
    setOpen(false);
    action();
  }

  return (
    // z-30 när menyn är öppen, så att den hamnar över grannkortens knappar.
    <div ref={containerRef} className={`${className} ${open ? "z-30" : "z-10"}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Fler alternativ för ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[var(--navy)] shadow transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm5.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Alternativ för ${title}`}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-[var(--sky-blue)] bg-white py-1 shadow-md"
        >
          {viewHref && (
            <Link
              href={viewHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={MENU_ITEM_CLASSES}
            >
              Visa annons
            </Link>
          )}
          <div
            role="menuitem"
            aria-disabled="true"
            className="flex w-full cursor-not-allowed items-center gap-2 px-4 py-2 text-left text-sm text-[var(--navy)] opacity-50"
          >
            Redigera
            <span className="text-xs text-gray-500">kommer snart</span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onToggleSold)}
            className={MENU_ITEM_CLASSES}
          >
            {isSold ? "Sätt till salu igen" : "Markera som såld"}
          </button>
          <div className="my-1 border-t border-black/5" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onDelete)}
            className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
          >
            Ta bort
          </button>
        </div>
      )}
    </div>
  );
}
