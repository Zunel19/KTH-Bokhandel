const SELECT_CLASSES =
  "appearance-none rounded-full bg-white pl-4 pr-9 py-2 text-sm text-[var(--navy)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";

function FilterSelect({ children, defaultValue }) {
  return (
    <div className="relative">
      <select className={SELECT_CLASSES} defaultValue={defaultValue}>
        {children}
      </select>
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
    </div>
  );
}

export default function FilterBar() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-wrap gap-4 px-6 py-4 sm:px-8">
      <FilterSelect defaultValue="Alla kurser">
        <option>Alla kurser</option>
      </FilterSelect>

      <FilterSelect defaultValue="Skick">
        <option>Skick</option>
        <option>Nyskick</option>
        <option>Bra skick</option>
        <option>Använt skick</option>
      </FilterSelect>

      <FilterSelect defaultValue="Pris">
        <option>Pris</option>
        <option>Under 100 kr</option>
        <option>100–300 kr</option>
        <option>300+ kr</option>
      </FilterSelect>
    </section>
  );
}
