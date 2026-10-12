"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setListingStatus, deleteListing } from "@/lib/listingActions";
import ListingMenu from "@/components/ListingMenu";
import DeleteListingDialog from "@/components/DeleteListingDialog";

// Ägarens meny på annonssidan. Renderar ingenting för andra besökare.
export default function OwnerMenu({ listingId, sellerId, status, title, images }) {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    async function checkOwner() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id === sellerId) setUserId(session.user.id);
    }
    checkOwner();
  }, [sellerId]);

  if (!userId) return null;

  async function handleToggleSold() {
    setError(null);
    setBusy(true);
    const { error } = await setListingStatus(
      listingId,
      userId,
      status === "såld" ? "till salu" : "såld"
    );
    if (error) {
      console.error("Kunde inte ändra status:", error);
      setError("Något gick fel, försök igen.");
    } else {
      // Hämtar om annonssidan så att etiketter och knappar uppdateras.
      router.refresh();
    }
    setBusy(false);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await deleteListing(
      { id: listingId, listing_images: images },
      userId
    );
    if (error) {
      console.error("Kunde inte ta bort annonsen:", error);
      setDeleteError("Något gick fel, försök igen.");
      setDeleting(false);
      return;
    }
    router.replace("/profil");
  }

  return (
    <div className="relative shrink-0">
      <ListingMenu
        title={title}
        status={status}
        busy={busy}
        onToggleSold={handleToggleSold}
        onDelete={() => {
          setDeleteError(null);
          setDialogOpen(true);
        }}
      />
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full mt-2 whitespace-nowrap text-sm text-red-600"
        >
          {error}
        </p>
      )}
      <DeleteListingDialog
        title={title}
        open={dialogOpen}
        busy={deleting}
        error={deleteError}
        onCancel={() => setDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
