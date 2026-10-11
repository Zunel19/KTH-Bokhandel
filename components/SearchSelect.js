"use client";

import { useState } from "react";

const INPUT_CLASSES =
  "w-full rounded-lg border border-[var(--sky-blue)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";

// Sökbart fält med nedfällbar lista.
// items: [{ id, label, primary, secondary }]. label fylls i fältet efter val,
// primary visas till vänster i listan och secondary till höger i grått.
export default function SearchSelect({
  items,
  value,
  onChange,
  placeholder,
  id,
  emptyText,
}) {
  const [query, setQuery] = useState(
    () => items.find((item) => item.id === value)?.label ?? ""
  );
  const [open, setOpen] = useState(false);
  // Senaste värdet som komponenten själv skickat via onChange. Skiljer
  // ändringar utifrån (t.ex. nollställning) från användarens egna.
  const [emitted, setEmitted] = useState(value);

  if (value !== emitted) {
    setEmitted(value);
    setQuery(
      value === null
        ? ""
        : (items.find((item) => item.id === value)?.label ?? "")
    );
  }

  const filtered =
    query.trim() === ""
      ? items
      : items.filter((item) =>
          `${item.label} ${item.secondary ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );

  function handleSelect(item) {
    setQuery(item.label);
    setEmitted(item.id);
    onChange(item.id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kth-blue)]/50"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          id={id}
          type="text"
          className={`${INPUT_CLASSES} pl-9`}
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setEmitted(null);
            onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
        />
      </div>

      {open && (
        <ul className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--sky-blue)] bg-white shadow-md">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(item)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[var(--navy)] hover:bg-[var(--sky-blue)]/10"
                >
                  <span>{item.primary}</span>
                  {item.secondary && (
                    <span className="text-xs text-gray-500">
                      {item.secondary}
                    </span>
                  )}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-sm text-gray-500">{emptyText}</li>
          )}
        </ul>
      )}
    </div>
  );
}
