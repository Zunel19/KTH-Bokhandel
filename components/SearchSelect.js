"use client";

import { useState, useRef, useEffect } from "react";

const INPUT_CLASSES =
  "w-full rounded-lg border border-[var(--sky-blue)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";

// Sökbart fält med nedfällbar lista.
// items: [{ id, label, primary, secondary }]. label fylls i fältet efter val,
// primary visas till vänster i listan och secondary till höger i grått.
//
// clearOnType (standard true): att skriva nollställer valet, som i
// annonsformuläret. Med clearOnType={false} är det en vanlig combobox där
// skrivandet bara filtrerar listan och valet ändras först vid klick/Enter.
export default function SearchSelect({ clearOnType = true, ...props }) {
  return clearOnType ? (
    <ClearingSearchSelect {...props} />
  ) : (
    <ComboboxSelect {...props} />
  );
}

// Formulärens beteende (oförändrat).
function ClearingSearchSelect({
  items,
  value,
  onChange,
  placeholder,
  id,
  emptyText,
  autoFocus = false,
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
          autoFocus={autoFocus}
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

// Combobox: fältet visar valets etikett när det inte redigeras. Vid fokus
// markeras texten och hela listan visas; filtrering sker först när man skriver.
function ComboboxSelect({
  items,
  value,
  onChange,
  placeholder,
  id,
  emptyText,
  autoFocus = false,
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef(null);
  const listRef = useRef(null);

  const selectedLabel = items.find((item) => item.id === value)?.label ?? "";

  const filtered =
    !typed || query.trim() === ""
      ? items
      : items.filter((item) =>
          `${item.label} ${item.secondary ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  // Håll det markerade alternativet synligt i listan.
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function stopEditing() {
    setEditing(false);
    setOpen(false);
    setTyped(false);
    setActiveIndex(-1);
  }

  function handleSelect(item) {
    clearTimeout(blurTimer.current);
    onChange(item.id);
    stopEditing();
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Enter väljer det markerade alternativet och skickar aldrig formuläret.
      e.preventDefault();
      if (open && filtered[activeIndex]) handleSelect(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      // Första Esc stänger bara listan, nästa får stänga omgivande popover.
      if (open) e.stopPropagation();
      stopEditing();
    }
  }

  const listId = id ? `${id}-list` : undefined;

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
          autoFocus={autoFocus}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 && listId
              ? `${listId}-${activeIndex}`
              : undefined
          }
          className={`${INPUT_CLASSES} pl-9`}
          placeholder={placeholder}
          value={editing ? query : selectedLabel}
          autoComplete="off"
          onFocus={(e) => {
            clearTimeout(blurTimer.current);
            setEditing(true);
            setQuery(selectedLabel);
            setTyped(false);
            setOpen(true);
            setActiveIndex(-1);
            e.target.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setTyped(true);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Fördröjning så att ett klick på ett alternativ hinner registreras.
            blurTimer.current = setTimeout(stopEditing, 100);
          }}
        />
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--sky-blue)] bg-white shadow-md"
        >
          {filtered.length > 0 ? (
            filtered.map((item, index) => (
              <li
                key={item.id}
                id={listId ? `${listId}-${index}` : undefined}
                data-index={index}
                role="option"
                aria-selected={item.id === value}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[var(--navy)] hover:bg-[var(--sky-blue)]/10 ${
                    index === activeIndex ? "bg-[var(--sky-blue)]/10" : ""
                  }`}
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
