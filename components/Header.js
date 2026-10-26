"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import { clearPageState } from "@/lib/homeState";
import { countUnread } from "@/lib/messages";

// Döljer den globala headern på de fristående auth-sidorna.
// Ta bara bort den här listan/checken för att visa headern där igen.
const HIDDEN_ON = ["/logga-in", "/valkommen"];

// Vänta så här länge efter en ändring innan antalet olästa hämtas om.
const UNREAD_DEBOUNCE_MS = 300;

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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
        setUnreadCount(0);
        setMenuOpen(false);
      }
      setChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Antal olästa konversationer: hämtas när en användare är inloggad, vid
  // fokus, när fliken blir synlig och vid ändringar via realtime.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let channel = null;
    let debounceTimer = null;

    async function fetchUnread() {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id, buyer_id, seller_id, last_message_at, last_message_sender_id, buyer_last_read_at, seller_last_read_at"
        );
      if (cancelled) return;
      if (error) {
        console.error("Kunde inte hämta olästa meddelanden:", error);
        return;
      }
      setUnreadCount(countUnread(data, userId));
    }

    function scheduleFetch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchUnread, UNREAD_DEBOUNCE_MS);
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") scheduleFetch();
    }

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      // Realtime behöver sessionens token för att RLS ska släppa igenom ändringar.
      if (session) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`header-unread:${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          scheduleFetch
        )
        .subscribe();
    }

    fetchUnread();
    subscribe();
    window.addEventListener("focus", scheduleFetch);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      window.removeEventListener("focus", scheduleFetch);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

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
    setUnreadCount(0);
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
          // Ikon (40) + mellanrum (8) + avatar (40) + mellanrum (4) + menyknapp (32).
          <div className="h-10 w-[124px]" />
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
          <div className="flex items-center gap-2">
            <Link
              href="/meddelanden"
              aria-label={
                unreadCount > 0
                  ? `Meddelanden, ${unreadCount} olästa`
                  : "Meddelanden"
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--navy)] transition-colors hover:bg-[var(--sky-blue)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sand)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"
                />
              </svg>
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--kth-blue)] px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
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
          </div>
        )}
      </div>
    </header>
  );
}
