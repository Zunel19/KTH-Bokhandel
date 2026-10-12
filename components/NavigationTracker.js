"use client";

import { useEffect } from "react";
import { markReturning } from "@/lib/homeState";

// Webbläsarens tillbaka- och framåtknappar (och svep på mobil) utlöser
// popstate, vanliga länkklick gör det inte. Renderar ingenting.
export default function NavigationTracker() {
  useEffect(() => {
    window.addEventListener("popstate", markReturning);
    return () => window.removeEventListener("popstate", markReturning);
  }, []);

  return null;
}
