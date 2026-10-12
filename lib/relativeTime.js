const rtf = new Intl.RelativeTimeFormat("sv", { numeric: "auto" });

// "idag", "i går", "för 3 dagar sedan", "för 2 veckor sedan" osv.
export function postedAgo(dateString) {
  const days = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days < 1) return "idag";
  if (days <= 6) return rtf.format(-days, "day");
  const weeks = Math.floor(days / 7);
  if (weeks <= 4) return rtf.format(-weeks, "week");
  const months = Math.floor(days / 30);
  if (months < 12) return rtf.format(-Math.max(months, 1), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}
