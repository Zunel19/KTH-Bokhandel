"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { markReturning, incrementNavCount } from "@/lib/homeState";

// Webbläsarens tillbaka- och framåtknappar (och svep på mobil) utlöser
// popstate, vanliga länkklick gör det inte. Räknar dessutom sidbyten inom
// appen, så att tillbaka-länken vet om det finns en sida att gå tillbaka till.
// Renderar ingenting.
export default function NavigationTracker() {
  const pathname = usePathname();
  const previousPathRef = useRef(null);

  useEffect(() => {
    window.addEventListener("popstate", markReturning);
    return () => window.removeEventListener("popstate", markReturning);
  }, []);

  // Jämförelsen mot ref:en hoppar över första renderingen och dubbla
  // effektkörningar i Strict Mode.
  useEffect(() => {
    if (previousPathRef.current !== null && previousPathRef.current !== pathname) {
      incrementNavCount();
    }
    previousPathRef.current = pathname;
  }, [pathname]);

  return null;
}
