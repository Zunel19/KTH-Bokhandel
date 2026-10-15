// Scrollar till resultatrubriken (id="resultat"), men bara om den inte
// redan syns nära fönstrets överkant.
export function scrollToResults() {
  const el = document.getElementById("resultat");
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  if (top >= 0 && top <= 140) return;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
