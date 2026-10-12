import { cache } from "react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import ListingGallery from "@/components/ListingGallery";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

// Delas av generateMetadata och sidan, så att annonsen bara hämtas en gång.
const getListing = cache(async (id) => {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, description, price, meeting_point, status, created_at, seller_id, year, profiles(username), programs(name, years), listing_images(image_url, position), listing_items(title, isbn, condition, position, courses(code, name))"
    )
    .eq("id", id)
    .order("position", { referencedTable: "listing_images", ascending: true })
    .order("position", { referencedTable: "listing_items", ascending: true })
    .maybeSingle();

  // Ogiltigt id (t.ex. inte ett uuid) ger ett fel, och behandlas som "finns inte".
  if (error || !data) return null;
  return data;
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) {
    return { title: "Annonsen hittades inte" };
  }
  return { title: `${listing.title} – KTH Bokhandel` };
}

const rtf = new Intl.RelativeTimeFormat("sv", { numeric: "auto" });

// "idag", "i går", "för 3 dagar sedan", "för 2 veckor sedan" osv.
function postedAgo(dateString) {
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

function courseLabel(course) {
  return `${course.code} — ${course.name}`;
}

export default async function AnnonsPage({ params }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const items = listing.listing_items ?? [];
  const images = listing.listing_images ?? [];
  const isBundle = items.length >= 2;
  const isSold = listing.status === "såld";
  const username = listing.profiles?.username ?? "Okänd";
  const program = listing.programs;

  // Har alla böcker samma kurs visas den en gång, annars per bok.
  const firstCourse = items[0]?.courses ?? null;
  const sharedCourse =
    !program &&
    firstCourse &&
    items.every((item) => item.courses?.code === firstCourse.code)
      ? firstCourse
      : null;
  const showCoursePerBook = !program && !sharedCourse;

  return (
    <main className="min-h-screen bg-[var(--sand)]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <BackLink />

        <div className="grid gap-10 md:grid-cols-2">
          <ListingGallery images={images} title={listing.title} sold={isSold} />

          <div className="flex flex-col gap-4">
            <h1 className="font-serif text-3xl text-[var(--navy)]">
              {listing.title}
            </h1>

            <p className="text-2xl font-semibold text-[var(--kth-blue)]">
              {`${listing.price} kr`}
            </p>

            {(isBundle || isSold) && (
              <div className="flex flex-wrap items-center gap-2">
                {isBundle && (
                  <span className="rounded-full border border-[var(--sky-blue)] bg-white px-2 py-0.5 text-xs font-medium text-[var(--kth-blue)]">
                    {`Bundle · ${items.length} böcker`}
                  </span>
                )}
                {isSold && (
                  <span className="rounded-full bg-[var(--navy)] px-2.5 py-0.5 text-xs font-medium text-white">
                    Såld
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Avatar seed={listing.seller_id} name={username} size={32} />
              <span className="text-sm font-medium text-[var(--navy)]">
                {username}
              </span>
            </div>

            <p className="text-sm text-gray-500">
              Upplagd {postedAgo(listing.created_at)}
            </p>

            {listing.meeting_point && (
              <p className="text-sm text-[var(--navy)]">
                Möts helst vid: {listing.meeting_point}
              </p>
            )}

            {isSold ? (
              <p className="text-sm text-[var(--navy)]">
                Den här annonsen är såld.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white opacity-60"
                >
                  Kontakta säljaren
                </button>
                <p className="text-center text-xs text-gray-500">
                  Meddelanden kommer snart
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-8">
          {listing.description && (
            <section>
              <h2 className="mb-3 font-serif text-xl text-[var(--navy)]">
                Beskrivning
              </h2>
              <p className="max-w-prose whitespace-pre-line text-sm text-[var(--navy)]">
                {listing.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-serif text-xl text-[var(--navy)]">
              {isBundle ? "Ingår i annonsen" : "Om boken"}
            </h2>

            {program && (
              <p className="mb-4 inline-block rounded-full border border-[var(--sky-blue)] bg-white px-3 py-1 text-sm text-[var(--navy)]">
                Hör till: {program.name}
                {program.years > 1 && listing.year ? `, år ${listing.year}` : ""}
              </p>
            )}
            {sharedCourse && (
              <p className="mb-4 inline-block rounded-full border border-[var(--sky-blue)] bg-white px-3 py-1 text-sm text-[var(--navy)]">
                Kurs: {courseLabel(sharedCourse)}
              </p>
            )}

            <ul
              className={
                isBundle
                  ? "grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex"
              }
            >
              {items.map((item) => (
                <li
                  key={item.position}
                  className={`flex flex-col gap-1 rounded-lg border border-black/5 bg-white p-4 ${
                    isBundle ? "" : "w-full max-w-sm"
                  }`}
                >
                  {item.title && (
                    <p className="font-semibold text-[var(--navy)]">
                      {item.title}
                    </p>
                  )}
                  <p className="text-sm text-[var(--navy)]">
                    {[
                      item.condition,
                      item.isbn && `ISBN ${item.isbn}`,
                      showCoursePerBook && item.courses?.code,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
