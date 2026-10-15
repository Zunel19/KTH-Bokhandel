"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { parseFilters, buildQueryString, setUrlFilters } from "@/lib/searchParams";
import { scrollToResults } from "@/lib/scroll";
import SearchSelect from "@/components/SearchSelect";

const PILL_BASE =
  "rounded-full py-2 pl-4 pr-9 text-sm text-[var(--navy)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";
const PILL_INACTIVE = "border border-transparent bg-white";
const PILL_ACTIVE = "border border-[var(--kth-blue)] bg-[var(--kth-blue)]/10";

const CONDITIONS = [
  { code: "ny", label: "Ny" },
  { code: "nyskick", label: "Nyskick" },
  { code: "anvant", label: "Använt skick" },
];

const SORTS = [
  { value: "nyast", label: "Nyast" },
  { value: "pris-asc", label: "Lägst pris" },
  { value: "pris-desc", label: "Högst pris" },
];

function pillClasses(active) {
  return `${PILL_BASE} ${active ? PILL_ACTIVE : PILL_INACTIVE}`;
}

function Chevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kth-blue)]/60"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.293l3.71-4.06a.75.75 0 1 1 1.08 1.04l-4.25 4.65a.75.75 0 0 1-1.08 0l-4.25-4.65a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Pillerformad <select> i filterradens stil.
function SelectPill({ label, value, onChange, active, children }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none ${pillClasses(active)}`}
      >
        {children}
      </select>
      <Chevron />
    </div>
  );
}

// Knapp som öppnar en popover. Stängs vid klick utanför, Esc och när fokus
// lämnar den (Tab). onClear visar en ✕ i stället för pilen.
function PopoverPill({
  label,
  active,
  open,
  onOpenChange,
  onClear,
  clearLabel,
  popoverLabel,
  widthClass = "w-64",
  children,
}) {
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  // Fokus till första fältet när popovern öppnas.
  useEffect(() => {
    if (!open) return;
    const first = popoverRef.current?.querySelector(
      "input, button, select, [tabindex]:not([tabindex='-1'])"
    );
    first?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e) {
      if (!containerRef.current?.contains(e.target)) onOpenChange(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onOpenChange]);

  function handleKeyDown(e) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      onOpenChange(false);
      buttonRef.current?.focus();
    }
  }

  function handleBlur(e) {
    // Fokus lämnade hela filtret (t.ex. med Tab).
    if (open && !containerRef.current?.contains(e.relatedTarget)) {
      onOpenChange(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={`whitespace-nowrap ${pillClasses(active)}`}
      >
        {label}
      </button>
      {active && onClear ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            onClear();
            onOpenChange(false);
          }}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs text-[var(--navy)]/70 transition-colors hover:bg-[var(--kth-blue)]/10 hover:text-[var(--navy)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)]"
        >
          ✕
        </button>
      ) : (
        <Chevron />
      )}

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={popoverLabel}
          className={`absolute left-0 top-full z-20 mt-2 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--sky-blue)] bg-white p-3 shadow-md ${widthClass}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}


function priceLabel(min, max) {
  if (min !== null && max !== null) return `${min}–${max} kr`;
  if (min !== null) return `Från ${min} kr`;
  if (max !== null) return `Till ${max} kr`;
  return "Pris";
}

function conditionLabel(codes) {
  if (codes.length === 0) return "Skick";
  if (codes.length === 1) {
    return CONDITIONS.find((c) => c.code === codes[0])?.label ?? "Skick";
  }
  return `Skick · ${codes.length}`;
}

function parsePriceInput(value) {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}


// Utkastet: det som är valt i filterraden men ännu inte tillämpat.
// min och max är strängar så som de står i fälten.
function draftFromFilters(filters) {
  return {
    kurs: filters.kurs,
    program: filters.program,
    ar: filters.ar,
    skick: filters.skick,
    min: filters.min !== null ? String(filters.min) : "",
    max: filters.max !== null ? String(filters.max) : "",
  };
}

// De delar av adressen som utkastet utgår från (inte sorteringen, som
// tillämpas direkt och inte ska nollställa ett pågående utkast).
function appliedSignature(filters) {
  return buildQueryString({ ...filters, sort: "nyast" });
}

export default function FilterBar() {
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);

  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  // Bara ett filter öppet åt gången.
  const [openId, setOpenId] = useState(null);

  // Utkastet återställs varje gång adressens filter ändras utifrån (bakåt,
  // "Rensa filter", ✕ i sökfältet, omladdning).
  const [draft, setDraft] = useState(() => draftFromFilters(filters));
  const signature = appliedSignature(filters);
  const [syncedSignature, setSyncedSignature] = useState(signature);
  if (signature !== syncedSignature) {
    setSyncedSignature(signature);
    setDraft(draftFromFilters(filters));
  }

  useEffect(() => {
    async function fetchOptions() {
      const [coursesResult, programsResult] = await Promise.all([
        supabase.from("courses").select("id, code, name").order("code"),
        supabase.from("programs").select("id, name, years").order("name"),
      ]);
      if (coursesResult.error) {
        console.error("Kunde inte hämta kurser:", coursesResult.error);
      } else {
        setCourses(coursesResult.data);
      }
      if (programsResult.error) {
        console.error("Kunde inte hämta program:", programsResult.error);
      } else {
        setPrograms(programsResult.data);
      }
    }
    fetchOptions();
  }, []);

  function changeDraft(changes) {
    setDraft((prev) => ({ ...prev, ...changes }));
  }

  function setOpen(id, open) {
    setOpenId((current) => (open ? id : current === id ? null : current));
  }

  // Utkastet som filter, och om det är giltigt och skiljer sig från adressen.
  const draftMin = parsePriceInput(draft.min);
  const draftMax = parsePriceInput(draft.max);
  const priceInvalid =
    draftMin !== null && draftMax !== null && draftMin > draftMax;
  const draftFilters = {
    ...filters,
    kurs: draft.kurs,
    program: draft.program,
    ar: draft.ar,
    skick: draft.skick,
    min: draftMin,
    max: draftMax,
  };
  const changed = buildQueryString(draftFilters) !== buildQueryString(filters);
  const canApply = changed && !priceInvalid;

  function applyDraft() {
    if (!canApply) return;
    setUrlFilters(draftFilters);
    setOpenId(null);
    requestAnimationFrame(scrollToResults);
  }

  // Kurs
  const courseItems = courses.map((c) => ({
    id: c.id,
    label: `${c.code} — ${c.name}`,
    primary: c.name,
    secondary: c.code,
  }));
  const selectedCourse = courses.find((c) => c.id === draft.kurs);

  // Program
  const programItems = programs.map((p) => ({
    id: p.id,
    label: p.name,
    primary: p.name,
    secondary: `${p.years} år`,
  }));
  const selectedProgram = programs.find((p) => p.id === draft.program);

  function toggleCondition(code) {
    const next = draft.skick.includes(code)
      ? draft.skick.filter((c) => c !== code)
      : [...draft.skick, code];
    // Behåll samma ordning som i listan.
    changeDraft({
      skick: CONDITIONS.map((c) => c.code).filter((c) => next.includes(c)),
    });
  }

  const linkButton =
    "text-sm text-[var(--kth-blue)] hover:underline focus:outline-none focus-visible:underline";
  const priceInputClasses =
    "w-full rounded-lg border border-[var(--sky-blue)] bg-white px-3 py-2 text-sm text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-6 py-4 sm:px-8">
      <PopoverPill
        label={draft.kurs ? (selectedCourse?.code ?? "Vald kurs") : "Alla kurser"}
        active={Boolean(draft.kurs)}
        open={openId === "kurs"}
        onOpenChange={(open) => setOpen("kurs", open)}
        onClear={() => changeDraft({ kurs: null })}
        clearLabel="Ta bort kursfilter"
        popoverLabel="Välj kurs"
        widthClass="w-80"
      >
        <SearchSelect
          clearOnType={false}
          id="filter-kurs"
          items={courseItems}
          value={draft.kurs}
          onChange={(id) => {
            changeDraft({ kurs: id });
            setOpen("kurs", false);
          }}
          placeholder="Alla kurser"
          emptyText="Inga kurser hittades"
          autoFocus
        />
      </PopoverPill>

      <PopoverPill
        label={
          draft.program
            ? (selectedProgram?.name ?? "Valt program")
            : "Alla program"
        }
        active={Boolean(draft.program)}
        open={openId === "program"}
        onOpenChange={(open) => setOpen("program", open)}
        onClear={() => changeDraft({ program: null, ar: null })}
        clearLabel="Ta bort programfilter"
        popoverLabel="Välj program"
        widthClass="w-80"
      >
        <SearchSelect
          clearOnType={false}
          id="filter-program"
          items={programItems}
          value={draft.program}
          onChange={(id) => {
            // Byte av program nollställer årskursen.
            changeDraft({
              program: id,
              ar: id === draft.program ? draft.ar : null,
            });
            setOpen("program", false);
          }}
          placeholder="Alla program"
          emptyText="Inga program hittades"
          autoFocus
        />
      </PopoverPill>

      {selectedProgram && selectedProgram.years > 1 && (
        <SelectPill
          label="Årskurs"
          value={draft.ar ?? ""}
          active={Boolean(draft.ar)}
          onChange={(value) => changeDraft({ ar: value ? Number(value) : null })}
        >
          <option value="">Alla år</option>
          {Array.from({ length: selectedProgram.years }, (_, i) => i + 1).map(
            (y) => (
              <option key={y} value={y}>
                År {y}
              </option>
            )
          )}
        </SelectPill>
      )}

      <PopoverPill
        label={conditionLabel(draft.skick)}
        active={draft.skick.length > 0}
        open={openId === "skick"}
        onOpenChange={(open) => setOpen("skick", open)}
        popoverLabel="Välj skick"
        widthClass="w-56"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Skick</legend>
          {CONDITIONS.map((condition) => (
            <label
              key={condition.code}
              className="flex cursor-pointer items-center gap-2 text-sm text-[var(--navy)]"
            >
              <input
                type="checkbox"
                checked={draft.skick.includes(condition.code)}
                onChange={() => toggleCondition(condition.code)}
                className="h-4 w-4 accent-[var(--kth-blue)]"
              />
              {condition.label}
            </label>
          ))}
        </fieldset>
        {draft.skick.length > 0 && (
          <button
            type="button"
            onClick={() => changeDraft({ skick: [] })}
            className={`mt-3 ${linkButton}`}
          >
            Rensa
          </button>
        )}
      </PopoverPill>

      <PopoverPill
        label={priceInvalid ? "Pris" : priceLabel(draftMin, draftMax)}
        active={draftMin !== null || draftMax !== null}
        open={openId === "pris"}
        onOpenChange={(open) => setOpen("pris", open)}
        popoverLabel="Välj pris"
        widthClass="w-64"
      >
        <form
          onSubmit={(e) => {
            // Enter i ett prisfält applicerar filtren.
            e.preventDefault();
            applyDraft();
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-500">
              Från (kr)
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.min}
                onChange={(e) => changeDraft({ min: e.target.value })}
                className={priceInputClasses}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-500">
              Till (kr)
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.max}
                onChange={(e) => changeDraft({ max: e.target.value })}
                className={priceInputClasses}
              />
            </label>
          </div>
          {priceInvalid && (
            <p className="text-xs text-red-600" role="alert">
              Från kan inte vara större än till.
            </p>
          )}
          <button type="submit" className="sr-only">
            Applicera filter
          </button>
          {(draft.min || draft.max) && (
            <button
              type="button"
              onClick={() => changeDraft({ min: "", max: "" })}
              className={`self-start ${linkButton}`}
            >
              Rensa
            </button>
          )}
        </form>
      </PopoverPill>

      <button
        type="button"
        onClick={applyDraft}
        disabled={!canApply}
        className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sand)] ${
          canApply
            ? "border-transparent bg-[var(--kth-blue)] text-white hover:bg-[var(--navy)]"
            : "cursor-not-allowed border-black/10 bg-white/60 text-gray-400 shadow-none"
        }`}
      >
        Applicera filter
      </button>

      <div className="ml-auto">
        {/* Sorteringen tillämpas direkt, den ändrar bara ordningen. */}
        <SelectPill
          label="Sortera"
          value={filters.sort}
          active={false}
          onChange={(value) => setUrlFilters({ ...filters, sort: value })}
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              Sortera: {sort.label}
            </option>
          ))}
        </SelectPill>
      </div>
    </section>
  );
}
