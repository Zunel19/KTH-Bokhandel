"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import { clearPageState } from "@/lib/homeState";

// Döljer den globala headern på de fristående auth-sidorna.
// Ta bara bort den här listan/checken för att visa headern där igen.
const HIDDEN_ON = ["/logga-in", "/valkommen"];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const userIdRef = useRef(null);

  useEffect(() => {
    async function loadUsername(userId) {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();
      setUsername(data?.username ?? null);
    }

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      if (currentUser && currentUser.id !== userIdRef.current) {
        loadUsername(currentUser.id);
      }
      userIdRef.current = currentUser?.id ?? null;
      setUser(currentUser);
      setChecked(true);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      if (currentUser && currentUser.id !== userIdRef.current) {
        loadUsername(currentUser.id);
      }
      userIdRef.current = currentUser?.id ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setUsername(null);
        setMenuOpen(false);
      }
      setChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    // Sparade sidlägen hör till den utloggade användaren.
    clearPageState("kthb:profile");
    clearPageState("kthb:home");
    if (error) {
      console.error("Utloggning misslyckades:", error);
    }
    userIdRef.current = null;
    setMenuOpen(false);
    setUser(null);
    setUsername(null);
    router.push("/");
    router.refresh();
  }

  // Loggan ger alltid en färsk startsida längst upp, utan återställt läge.
  function handleLogoClick(e) {
    clearPageState("kthb:home");
    clearPageState("kthb:profile");
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (HIDDEN_ON.includes(pathname)) {
    return null;
  }

  return (
    <header className="relative z-50 bg-[var(--sand)] border-b border-[var(--kth-blue)]/20">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="rounded font-semibold text-[var(--navy)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sand)]"
        >
          KTH Bokhandel
        </Link>

        {!checked ? (
          <div className="h-10 w-10" />
        ) : !user ? (
          <Link
            href="/logga-in"
            aria-label="Logga in"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[var(--kth-blue)]/30 text-[var(--kth-blue)] hover:bg-[var(--kth-blue)]/5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Z" />
            </svg>
          </Link>
        ) : (
          <div ref={menuRef} className="relative flex items-center gap-1">
            <Link href="/profil" aria-label="Min profil">
              <Avatar seed={user.id} name={username ?? user.email} size={40} />
            </Link>
            <button
              type="button"
              aria-label="Öppna meny"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--navy)] transition-colors hover:bg-[var(--kth-blue)]/5"
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
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-[var(--sky-blue)] bg-white shadow-md">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm text-[var(--navy)] hover:bg-[var(--sky-blue)]/10"
                >
                  Logga ut
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
