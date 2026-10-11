"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resizeToJpeg } from "@/lib/imageUtils";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const MEETING_POINTS = ["Biblioteket", "Kårhuset", "Drottning Kristinas väg"];

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const BUCKET = "listing-images";

const INPUT_CLASSES =
  "w-full rounded-lg border border-[var(--sky-blue)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";

const LABEL_CLASSES = "text-sm font-medium text-[var(--navy)]";

// Hindrar att ett tryck på knappen startar en dragning.
function stopDrag(e) {
  e.stopPropagation();
}

function SortableThumbnail({ image, index, total, disabled, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`Bild ${index + 1} av ${total}`}
      className={`relative rounded-lg ${
        isDragging ? "z-10 cursor-grabbing shadow-lg" : "cursor-grab"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.previewUrl}
        alt={`Bild ${index + 1}`}
        draggable={false}
        className="aspect-square w-full rounded-lg border border-[var(--sky-blue)] object-cover"
      />
      <button
        type="button"
        aria-label="Ta bort bild"
        onClick={() => onRemove(image.id)}
        onMouseDown={stopDrag}
        onTouchStart={stopDrag}
        onKeyDown={stopDrag}
        disabled={disabled}
        className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/90 text-xs text-[var(--navy)] shadow-sm transition-colors hover:bg-white"
      >
        ✕
      </button>
      <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--kth-blue)] text-xs font-medium text-white">
        {index + 1}
      </span>
    </div>
  );
}

export default function SkapaAnnonsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("Nyskick");
  const [isbn, setIsbn] = useState("");

  const [courseQuery, setCourseQuery] = useState("");
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  const [meetingPoint, setMeetingPoint] = useState(MEETING_POINTS[0]);
  const [customMeetingPoint, setCustomMeetingPoint] = useState("");

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const [images, setImages] = useState([]);
  const [imagesError, setImagesError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const imagesRef = useRef(images);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Frigör förhandsvisningarna när sidan lämnas.
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

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

      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) {
        router.replace("/valkommen");
        return;
      }

      setUserId(user.id);
      setLoading(false);
    }

    checkSessionAndProfile();
  }, [router]);

  useEffect(() => {
    async function fetchCourses() {
      const { data, error } = await supabase.from("courses").select();
      if (!error) {
        setCourses(data);
      }
    }
    fetchCourses();
  }, []);

  const filteredCourses =
    courseQuery.trim() === ""
      ? courses
      : courses.filter((course) =>
          `${course.code} ${course.name}`
            .toLowerCase()
            .includes(courseQuery.toLowerCase()),
        );

  function handleCourseSelect(course) {
    setCourseQuery(`${course.code} — ${course.name}`);
    setSelectedCourseId(course.id);
    setShowCourseDropdown(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (title.trim() === "") {
      setError("Ange en titel.");
      return;
    }
    if (selectedCourseId === null) {
      setError("Välj en kurs i listan.");
      return;
    }
    if (price === "" || Number.isNaN(Number(price)) || Number(price) < 0) {
      setError("Ange ett pris (0 kr eller mer).");
      return;
    }

    setSaving(true);

    // Förminska alla bilder innan något sparas, så att en trasig bild
    // stoppar allt innan annonsen skapas.
    let resized;
    try {
      resized = [];
      for (const image of images) {
        const full = await resizeToJpeg(image.file, 1400, 0.8);
        const thumb = await resizeToJpeg(image.file, 480, 0.75);
        resized.push({ full, thumb });
      }
    } catch (err) {
      console.error("Kunde inte förminska bild:", err);
      setError("En av bilderna kunde inte läsas. Använd JPG, PNG eller WebP.");
      setSaving(false);
      return;
    }

    const { data: listing, error: insertError } = await supabase
      .from("listings")
      .insert({
        seller_id: userId,
        course_id: selectedCourseId,
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        condition,
        meeting_point:
          (meetingPoint === "Valfritt"
            ? customMeetingPoint.trim()
            : meetingPoint) || null,
        isbn: isbn.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Kunde inte spara annonsen:", insertError);
      setError("Något gick fel, försök igen.");
      setSaving(false);
      return;
    }

    const listingId = listing.id;
    const uploadedPaths = [];

    try {
      const rows = [];
      for (let i = 0; i < resized.length; i++) {
        const n = i + 1;
        setUploadStatus(`Laddar upp bild ${n} av ${resized.length}...`);

        const fullPath = `${userId}/${listingId}/${n}.jpg`;
        const thumbPath = `${userId}/${listingId}/${n}_thumb.jpg`;

        for (const [path, blob] of [
          [fullPath, resized[i].full],
          [thumbPath, resized[i].thumb],
        ]) {
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, blob, {
              contentType: "image/jpeg",
              cacheControl: "31536000",
              upsert: false,
            });
          if (uploadError) throw uploadError;
          uploadedPaths.push(path);
        }

        rows.push({
          listing_id: listingId,
          image_url: supabase.storage.from(BUCKET).getPublicUrl(fullPath).data
            .publicUrl,
          thumb_url: supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data
            .publicUrl,
          position: n,
        });
      }

      if (rows.length > 0) {
        const { error: imagesInsertError } = await supabase
          .from("listing_images")
          .insert(rows);
        if (imagesInsertError) throw imagesInsertError;
      }
    } catch (err) {
      console.error("Kunde inte spara bilderna:", err);

      // Allt eller inget: städa bort allt som hann sparas.
      if (uploadedPaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove(uploadedPaths);
        if (removeError) console.error("Kunde inte ta bort filer:", removeError);
      }
      await supabase.from("listing_images").delete().eq("listing_id", listingId);
      const { error: deleteError } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId);
      if (deleteError) console.error("Kunde inte ta bort annonsen:", deleteError);

      setError("Något gick fel när bilderna skulle sparas. Försök igen.");
      setUploadStatus(null);
      setSaving(false);
      return;
    }

    setUploadStatus(null);
    setSaved(true);
    setSaving(false);
  }

  function handleImagesSelected(e) {
    const files = Array.from(e.target.files ?? []);
    // Nollställ så att samma fil kan väljas igen.
    e.target.value = "";

    const valid = files.filter(
      (file) => file.type.startsWith("image/") && file.size <= MAX_FILE_SIZE
    );
    setImagesError(
      valid.length < files.length
        ? "Några filer hoppades över (bara bilder upp till 25 MB)."
        : null
    );

    const room = MAX_IMAGES - images.length;
    const added = valid.slice(0, room).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...added]);
  }

  function handleRemoveImage(id) {
    const removed = images.find((image) => image.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    setImages((prev) => prev.filter((image) => image.id !== id));
  }

  // Ordningen i listan sparas som position (plats + 1).
  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((image) => image.id === active.id);
    const newIndex = images.findIndex((image) => image.id === over.id);
    setImages(arrayMove(images, oldIndex, newIndex));
  }

  function handleReset() {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setImagesError(null);
    setUploadStatus(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setCondition("Nyskick");
    setIsbn("");
    setCourseQuery("");
    setSelectedCourseId(null);
    setShowCourseDropdown(false);
    setMeetingPoint(MEETING_POINTS[0]);
    setCustomMeetingPoint("");
    setError(null);
    setSaving(false);
    setSaved(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--sand)] px-6 py-12">
        <p className="text-sm text-gray-500">Laddar...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--sand)] px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-xl">
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

        {saved ? (
          <div className="rounded-lg border border-black/5 bg-white p-8 shadow-sm">
            <h1 className="mb-2 font-serif text-3xl text-[var(--navy)]">
              Din annons är sparad
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              Annonsen är nu publicerad och syns för andra studenter.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]"
              >
                Lägg upp en till
              </button>
              <Link
                href="/"
                className="rounded-lg border border-[var(--kth-blue)] bg-transparent px-6 py-3 text-center text-sm font-medium text-[var(--kth-blue)] transition-colors hover:bg-[var(--kth-blue)] hover:text-white"
              >
                Till startsidan
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mb-8 font-serif text-3xl text-[var(--navy)] sm:text-4xl">
              Lägg upp en annons
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASSES} htmlFor="title">
                  Titel
                </label>
                <input
                  id="title"
                  type="text"
                  className={INPUT_CLASSES}
                  placeholder="T.ex. Endimensionell analys - Persson & Böiers"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="relative flex flex-col gap-1.5">
                <label className={LABEL_CLASSES} htmlFor="course">
                  Kurs
                </label>
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kth-blue)]/50"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    id="course"
                    type="text"
                    className={`${INPUT_CLASSES} pl-9`}
                    placeholder="Sök kurskod eller namn..."
                    value={courseQuery}
                    autoComplete="off"
                    onChange={(e) => {
                      setCourseQuery(e.target.value);
                      setShowCourseDropdown(true);
                      setSelectedCourseId(null);
                    }}
                    onFocus={() => setShowCourseDropdown(true)}
                    onBlur={() =>
                      setTimeout(() => setShowCourseDropdown(false), 100)
                    }
                  />
                </div>

                {showCourseDropdown && (
                  <ul className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-[var(--sky-blue)] bg-white shadow-md">
                    {filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <li key={course.code}>
                          <button
                            type="button"
                            onMouseDown={() => handleCourseSelect(course)}
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[var(--navy)] hover:bg-[var(--sky-blue)]/10"
                          >
                            <span>{course.name}</span>
                            <span className="text-xs text-gray-500">
                              {course.code}
                            </span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-2 text-sm text-gray-500">
                        Inga kurser hittades
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASSES} htmlFor="description">
                  Beskrivning
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className={`${INPUT_CLASSES} resize-none`}
                  placeholder="Skick, upplaga, ev. anteckningar i boken..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASSES} htmlFor="price">
                  Pris (kr)
                </label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  className={INPUT_CLASSES}
                  placeholder="250"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASSES} htmlFor="condition">
                  Skick
                </label>
                <select
                  id="condition"
                  className={INPUT_CLASSES}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option>Ny</option>
                  <option>Nyskick</option>
                  <option>Använt skick</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASSES} htmlFor="meetingPoint">
                  Mötesplats
                </label>
                {meetingPoint === "Valfritt" ? (
                  <input
                    id="meetingPoint"
                    type="text"
                    className={INPUT_CLASSES}
                    placeholder="Skriv in en mötesplats..."
                    value={customMeetingPoint}
                    onChange={(e) => setCustomMeetingPoint(e.target.value)}
                  />
                ) : (
                  <select
                    id="meetingPoint"
                    className={INPUT_CLASSES}
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                  >
                    {MEETING_POINTS.map((point) => (
                      <option key={point}>{point}</option>
                    ))}
                    <option>Valfritt</option>
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASSES} htmlFor="isbn">
                  ISBN (valfritt)
                </label>
                <input
                  id="isbn"
                  type="text"
                  className={INPUT_CLASSES}
                  placeholder="978-..."
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Hittas vanligtvis på bokens insida, t.ex. på andra sidan
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className={LABEL_CLASSES}>Bilder</span>
                <div className="flex items-center gap-3">
                  <input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    disabled={images.length >= MAX_IMAGES || saving}
                    onChange={handleImagesSelected}
                  />
                  <label
                    htmlFor="images"
                    aria-disabled={images.length >= MAX_IMAGES || saving}
                    className={`rounded-lg border border-[var(--sky-blue)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--kth-blue)] transition-colors ${
                      images.length >= MAX_IMAGES || saving
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-[var(--sky-blue)]/10"
                    }`}
                  >
                    Lägg till bilder
                  </label>
                  <span className="text-sm text-gray-500">
                    {images.length} av {MAX_IMAGES}
                  </span>
                </div>

                {imagesError && (
                  <p className="text-sm text-red-600">{imagesError}</p>
                )}

                {images.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={images.map((i) => i.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        {images.map((image, index) => (
                          <SortableThumbnail
                            key={image.id}
                            image={image}
                            index={index}
                            total={images.length}
                            disabled={saving}
                            onRemove={handleRemoveImage}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {images.length >= 2 && (
                  <p className="text-xs text-gray-500">
                    Dra för att ändra ordning. Bild 1 visas först på annonsen.
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)] disabled:opacity-60"
              >
                {saving ? "Sparar..." : "Lägg upp annons"}
              </button>

              {uploadStatus && (
                <p className="text-center text-sm text-gray-500">
                  {uploadStatus}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
