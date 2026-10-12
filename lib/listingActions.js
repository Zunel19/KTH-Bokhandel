import { supabase } from "@/lib/supabase";
import { clearPageState } from "@/lib/homeState";

const BUCKET = "listing-images";

// Sökvägen i Storage är det som kommer efter "/listing-images/" i URL:en.
function storagePath(url) {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

// Sparade sidlägen visar annonserna som de var, så de rensas efter en ändring.
function clearSavedPages() {
  clearPageState("kthb:home");
  clearPageState("kthb:profile");
}

export async function setListingStatus(listingId, userId, status) {
  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("seller_id", userId);

  if (!error) clearSavedPages();
  return { error };
}

// listing: { id, listing_images: [{ image_url, thumb_url }] }
export async function deleteListing(listing, userId) {
  const { error: imagesError } = await supabase
    .from("listing_images")
    .delete()
    .eq("listing_id", listing.id);
  if (imagesError) return { error: imagesError };

  // listing_items tas bort automatiskt via on delete cascade.
  const { error: listingError } = await supabase
    .from("listings")
    .delete()
    .eq("id", listing.id)
    .eq("seller_id", userId);
  if (listingError) return { error: listingError };

  // Filerna städas så gott det går, utan att blockera borttagningen.
  const paths = (listing.listing_images ?? [])
    .flatMap((image) => [storagePath(image.image_url), storagePath(image.thumb_url)])
    .filter(Boolean);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove(paths);
    if (storageError) {
      console.error("Kunde inte ta bort bildfiler:", storageError);
    }
  }

  clearSavedPages();
  return { error: null };
}
