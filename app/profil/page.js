"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  Fragment,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import ProfileListingCard from "@/components/ProfileListingCard";
import DeleteListingDialog from "@/components/DeleteListingDialog";
import { setListingStatus, deleteListing } from "@/lib/listingActions";
import {
  savePageState,
  loadPageState,
  clearPageState,
  consumeReturning,
} from "@/lib/homeState";

const PROFILE_STATE_KEY = "kthb:profile";

export default function ProfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);

  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [busyId, setBusyId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Scrollposition att återställa efter att sparade annonser renderats.
  const [restoreY, setRestoreY] = useState(null);
  const initializedRef = useRef(false);
  // Användar-id för ett återställt läge, eller null om inget återställdes.
  const restoredUserIdRef = useRef(null);

  // Vid tillbaka-navigering: visa sparat läge direkt, så att sidan har rätt
  // höjd och scrollpositionen kan återställas. Läses i en effekt för att
  // undvika hydreringsfel. Ref:en skyddar mot dubbelkörning i Strict Mode.
  useLayoutEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const saved = consumeReturning() ? loadPageState(PROFILE_STATE_KEY) : null;
    if (saved?.userId && Array.isArray(saved.listings)) {
      restoredUserIdRef.current = saved.userId;
      // Avsiktligt: sessionStorage kan inte läsas under rendering (servern
      // har den inte), och det ska ske före första målningen.
      /* eslint-disable react-hooks/set-state-in-effect */
      setUserId(saved.userId);
      setProfile({
        id: saved.userId,
        username: saved.username,
        created_at: saved.createdAt,
      });
      setListings(saved.listings);
      setLoading(false);
      setListingsLoading(false);
      setRestoreY(saved.scrollY ?? 0);
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      clearPageState(PROFILE_STATE_KEY);
    }
  }, []);

  // Next.js kan scrolla till toppen efter monteringen, så upprepa.
  useLayoutEffect(() => {
    if (restoreY === null) return;
    const y = restoreY;
    window.scrollTo(0, y);
    const frame = requestAnimationFrame(() => window.scrollTo(0, y));
    const timer = setTimeout(() => window.scrollTo(0, y), 60);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [restoreY]);

  useEffect(() => {
    async function checkSessionAndProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.replace("/logga-in");
        return;
      }

      // Sparat läge för en annan användare kastas och hämtas om som vanligt.
      if (
        restoredUserIdRef.current &&
        restoredUserIdRef.current !== user.id
      ) {
        restoredUserIdRef.current = null;
        clearPageState(PROFILE_STATE_KEY);
        setListings([]);
        setListingsLoading(true);
        setLoading(true);
      }
      const restored = restoredUserIdRef.current !== null;

      const { data } = await supabase
        .from("profiles")
        .select("id, username, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) {
        router.replace("/valkommen");
        return;
      }

      setUserId(user.id);
      setProfile(data);
      setLoading(false);

      const { data: rows, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, status, created_at, listing_images(image_url, thumb_url, position), listing_items(id)"
        )
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .order("position", { referencedTable: "listing_images", ascending: true });

      if (error) {
        console.error("Kunde inte hämta annonser:", error);
        // Visas sparade annonser redan behålls de i stället för ett felmeddelande.
        if (!restored) {
          setFetchError("Kunde inte hämta dina annonser just nu.");
        }
      } else {
        setListings(rows);
      }
      setListingsLoading(false);
    }

    checkSessionAndProfile();
  }, [router]);

  // Aktiva överst, sålda sist, nyast först inom varje grupp.
  const sortedListings = useMemo(
    () =>
      [...listings].sort((a, b) => {
        const aSold = a.status === "såld" ? 1 : 0;
        const bSold = b.status === "såld" ? 1 : 0;
        if (aSold !== bSold) return aSold - bSold;
        return new Date(b.created_at) - new Date(a.created_at);
      }),
    [listings]
  );

  const activeCount = listings.filter((l) => l.status === "till salu").length;
  const soldCount = listings.filter((l) => l.status === "såld").length;

  async function setStatus(listing, status) {
    setActionError(null);
    setBusyId(listing.id);
    const { error } = await setListingStatus(listing.id, userId, status);

    if (error) {
      console.error("Kunde inte ändra status:", error);
      setActionError("Något gick fel, försök igen.");
    } else {
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, status } : l))
      );
    }
    setBusyId(null);
  }

  function handleDeleteRequest(listing) {
    setDeleteError(null);
    setDeleteTarget(listing);
  }

  function closeDialog() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    const listing = deleteTarget;
    if (!listing) return;
    setDeleting(true);
    setDeleteError(null);
    setBusyId(listing.id);

    const { error } = await deleteListing(listing, userId);

    if (error) {
      console.error("Kunde inte ta bort annonsen:", error);
      setDeleteError("Något gick fel, försök igen.");
      setDeleting(false);
      setBusyId(null);
      return;
    }

    setListings((prev) => prev.filter((l) => l.id !== listing.id));
    setDeleting(false);
    setBusyId(null);
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--sand)] px-6 py-12">
        <p className="text-sm text-gray-500">Laddar...</p>
      </main>
    );
  }

  const hasListings = listings.length > 0;
  const memberSince = new Date(profile.created_at).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
  });

  return (
    <main className="min-h-screen bg-[var(--sand)]">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--navy)] transition-colors hover:text-[var(--kth-blue)] hover:underline"
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
              d="M17 10a.75.75 0 0 1-.75.75H5.56l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 1 1 1.06 1.06L5.56 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          Tillbaka
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar seed={userId} name={profile.username} size={72} />
            <div className="flex flex-col gap-0.5">
              <h1 className="font-serif text-3xl text-[var(--navy)]">
                {profile.username}
              </h1>
              <p className="text-sm text-gray-500">Medlem sedan {memberSince}</p>
              {!listingsLoading && !fetchError && (
                <p className="text-sm text-[var(--navy)]">
                  {activeCount} {activeCount === 1 ? "aktiv" : "aktiva"} ·{" "}
                  {soldCount} {soldCount === 1 ? "såld" : "sålda"}
                </p>
              )}
            </div>
          </div>
          {!listingsLoading && (
            <Link
              href="/skapa-annons"
              className="self-start rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)] sm:self-auto"
            >
              {hasListings ? "Lägg upp en annons" : "Skapa din första annons"}
            </Link>
          )}
        </div>

        {listingsLoading ? (
          <p className="text-sm text-gray-500">Laddar annonser...</p>
        ) : fetchError ? (
          <p className="text-sm text-red-600">{fetchError}</p>
        ) : !hasListings ? (
          <p className="text-sm text-gray-500">Du har inga annonser än.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {actionError && (
              <p className="text-sm text-red-600" role="alert">
                {actionError}
              </p>
            )}
            {activeCount === 0 && (
              <p className="text-sm text-gray-500">Du har inga aktiva annonser.</p>
            )}
            <div
              className="grid grid-cols-2 gap-4 md:grid-cols-3"
              onClickCapture={(e) => {
                // Spara läget när en länk till en annons klickas (kortet eller
                // "Visa annons" i menyn).
                if (e.target.closest('a[href^="/annons/"]')) {
                  savePageState(PROFILE_STATE_KEY, {
                    userId,
                    username: profile.username,
                    createdAt: profile.created_at,
                    listings,
                    scrollY: window.scrollY,
                  });
                }
              }}
            >
              {sortedListings.map((listing, index) => (
                <Fragment key={listing.id}>
                  {/* Rubrik före första sålda kortet, bara om båda grupperna finns. */}
                  {activeCount > 0 &&
                    listing.status === "såld" &&
                    sortedListings[index - 1]?.status !== "såld" && (
                      <h2 className="col-span-full mt-4 font-serif text-xl text-[var(--navy)]">
                        Sålda
                      </h2>
                    )}
                  <ProfileListingCard
                    listing={listing}
                    busy={busyId === listing.id}
                    onToggleSold={() =>
                      setStatus(
                        listing,
                        listing.status === "såld" ? "till salu" : "såld"
                      )
                    }
                    onDelete={() => handleDeleteRequest(listing)}
                  />
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      <DeleteListingDialog
        title={deleteTarget?.title}
        open={deleteTarget !== null}
        busy={deleting}
        error={deleteError}
        onCancel={closeDialog}
        onConfirm={handleDelete}
      />
    </main>
  );
}
