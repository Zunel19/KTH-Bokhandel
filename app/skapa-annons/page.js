"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resizeToJpeg } from "@/lib/imageUtils";
import Link from "next/link";
import SearchSelect from "@/components/SearchSelect";
import BackLink from "@/components/BackLink";
import { clearHomeState, clearPageState } from "@/lib/homeState";
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

const MIN_BOOKS = 2;
const MAX_BOOKS = 15;
const CONDITIONS = ["Ny", "Nyskick", "Använt skick"];

function newBook() {
  return {
    id: crypto.randomUUID(),
    title: "",
    courseId: null,
    condition: "Nyskick",
    isbn: "",
  };
}

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

  const [meetingPoint, setMeetingPoint] = useState(MEETING_POINTS[0]);
  const [customMeetingPoint, setCustomMeetingPoint] = useState("");

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Bundle-läge. linkType: "shared" (samma kurs), "course" (kurs per bok)
  // eller "program".
  const [mode, setMode] = useState("single");
  const [linkType, setLinkType] = useState("shared");
  const [sharedCourseId, setSharedCourseId] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState(null);
  const [year, setYear] = useState(null);
  const [books, setBooks] = useState(() => [newBook(), newBook()]);

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

  useEffect(() => {
    async function fetchPrograms() {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, years")
        .order("name");
      if (!error) {
        setPrograms(data);
      }
    }
    fetchPrograms();
  }, []);

  const courseItems = courses.map((c) => ({
    id: c.id,
    label: `${c.code} — ${c.name}`,
    primary: c.name,
    secondary: c.code,
  }));

  const programItems = programs.map((p) => ({
    id: p.id,
    label: p.name,
    primary: p.name,
    secondary: `${p.years} år`,
  }));

  const selectedProgram = programs.find((p) => p.id === programId) ?? null;

  function handleProgramChange(id) {
    setProgramId(id);
    // Program med ett enda år (t.ex. Tekniskt basår) får år 1 automatiskt.
    const program = programs.find((p) => p.id === id);
    setYear(program?.years === 1 ? 1 : null);
  }

  // Byte av koppling nollställer det som hörde till det gamla läget, så att
  // en bundle aldrig sparas med en blandning av kopplingar.
  function handleLinkTypeChange(type) {
    if (linkType === "shared") {
      setSharedCourseId(null);
    } else if (linkType === "course") {
      setBooks((prev) => prev.map((book) => ({ ...book, courseId: null })));
    } else if (linkType === "program") {
      setProgramId(null);
      setYear(null);
    }
    setLinkType(type);
  }

  function updateBook(id, changes) {
    setBooks((prev) =>
      prev.map((book) => (book.id === id ? { ...book, ...changes } : book))
    );
  }

  function addBook() {
    setBooks((prev) => (prev.length < MAX_BOOKS ? [...prev, newBook()] : prev));
  }

  function removeBook(id) {
    setBooks((prev) =>
      prev.length > MIN_BOOKS ? prev.filter((book) => book.id !== id) : prev
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (mode === "single") {
      if (title.trim() === "") {
        setError("Ange en titel.");
        return;
      }
      if (selectedCourseId === null) {
        setError("Välj en kurs i listan.");
        return;
      }
    } else {
      if (title.trim() === "") {
        setError("Ange en titel för bundlen.");
        return;
      }
      if (books.length < MIN_BOOKS) {
        setError("En bundle måste innehålla minst två böcker.");
        return;
      }
      if (linkType === "shared") {
        if (sharedCourseId === null) {
          setError("Välj en kurs för bundlen.");
          return;
        }
      } else if (linkType === "course") {
        const missing = books.findIndex((book) => book.courseId === null);
        if (missing !== -1) {
          setError(`Välj en kurs för bok ${missing + 1}.`);
          return;
        }
      } else if (programId === null || year === null) {
        setError("Välj program och årskurs.");
        return;
      }
      const untitled = books.findIndex((book) => book.title.trim() === "");
      if (untitled !== -1) {
        setError(`Ange en titel för bok ${untitled + 1}.`);
        return;
      }
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
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        meeting_point:
          (meetingPoint === "Valfritt"
            ? customMeetingPoint.trim()
            : meetingPoint) || null,
        ...(mode === "bundle" && linkType === "program"
          ? { program_id: programId, year }
          : {}),
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

    // En annons har alltid minst en bokrad i listing_items.
    const itemRows =
      mode === "single"
        ? [
            {
              listing_id: listingId,
              course_id: selectedCourseId,
              isbn: isbn.trim() || null,
              condition,
              position: 1,
            },
          ]
        : books.map((book, index) => ({
            listing_id: listingId,
            course_id:
              linkType === "shared"
                ? sharedCourseId
                : linkType === "course"
                  ? book.courseId
                  : null,
            title: book.title.trim(),
            isbn: book.isbn.trim() || null,
            condition: book.condition,
            position: index + 1,
          }));

    const { error: itemError } = await supabase
      .from("listing_items")
      .insert(itemRows);

    if (itemError) {
      console.error("Kunde inte spara boken:", itemError);
      // Bokraderna tas bort automatiskt via on delete cascade.
      const { error: deleteError } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId);
      if (deleteError) console.error("Kunde inte ta bort annonsen:", deleteError);
      setError("Något gick fel, försök igen.");
      setSaving(false);
      return;
    }

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
    // Sparade sidlägen saknar den nya annonsen.
    clearHomeState();
    clearPageState("kthb:profile");
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
    setSelectedCourseId(null);
    setMode("single");
    setLinkType("shared");
    setSharedCourseId(null);
    setProgramId(null);
    setYear(null);
    setBooks([newBook(), newBook()]);
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
        <BackLink />

        {saved ? (
          <div className="rounded-lg border border-black/5 bg-white p-8 shadow-sm">
            <h1 className="mb-2 font-serif text-3xl text-[var(--navy)]">
              Din annons är sparad
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              Annonsen är nu publicerad och syns för andra studenter.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]"
              >
                Lägg upp en till
              </button>
              <Link
                href="/profil"
                className="rounded-lg border border-[var(--kth-blue)] bg-transparent px-6 py-3 text-center text-sm font-medium text-[var(--kth-blue)] transition-colors hover:bg-[var(--kth-blue)] hover:text-white"
              >
                Till din profil
              </Link>
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
              <div
                role="radiogroup"
                aria-label="Typ av annons"
                className="mb-6 inline-flex self-start rounded-lg border border-[var(--sky-blue)] bg-white p-1"
              >
                {[
                  { value: "single", label: "En bok" },
                  { value: "bundle", label: "En bundle" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={mode === option.value}
                    onClick={() => setMode(option.value)}
                    className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                      mode === option.value
                        ? "bg-[var(--kth-blue)] text-white"
                        : "text-[var(--navy)] hover:bg-[var(--sky-blue)]/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASSES} htmlFor="title">
                  {mode === "bundle" ? "Titel på bundlen" : "Titel"}
                </label>
                <input
                  id="title"
                  type="text"
                  className={INPUT_CLASSES}
                  placeholder={
                    mode === "bundle"
                      ? "T.ex. Tekniskt basår, alla böcker"
                      : "T.ex. Endimensionell analys - Persson & Böiers"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {mode === "single" ? (
                <div className="relative flex flex-col gap-1.5">
                  <label className={LABEL_CLASSES} htmlFor="course">
                    Kurs
                  </label>
                  <SearchSelect
                    id="course"
                    items={courseItems}
                    value={selectedCourseId}
                    onChange={setSelectedCourseId}
                    placeholder="Sök kurskod eller namn..."
                    emptyText="Inga kurser hittades"
                  />
                </div>
              ) : (
                <>
                  <fieldset className="flex flex-col gap-2">
                    <legend className={`${LABEL_CLASSES} mb-1.5`}>
                      Koppling
                    </legend>
                    <div className="flex flex-col gap-2">
                      {[
                        {
                          value: "shared",
                          label: "Samma kurs",
                          hint: "Alla böcker hör till en och samma kurs",
                        },
                        {
                          value: "course",
                          label: "Kurs per bok",
                          hint: "Välj kurs för varje bok",
                        },
                        {
                          value: "program",
                          label: "Program och årskurs",
                          hint: "För t.ex. tekniskt basår, utan enskilda kurser",
                        },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-start gap-2.5"
                        >
                          <input
                            type="radio"
                            name="linkType"
                            value={option.value}
                            checked={linkType === option.value}
                            onChange={() => handleLinkTypeChange(option.value)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--kth-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kth-blue)]"
                          />
                          <span className="flex flex-col">
                            <span className="text-sm font-medium text-[var(--navy)]">
                              {option.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {option.hint}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>

                    {linkType === "shared" && (
                      <div className="relative mt-1 flex flex-col gap-1.5">
                        <label className={LABEL_CLASSES} htmlFor="sharedCourse">
                          Kurs
                        </label>
                        <SearchSelect
                          id="sharedCourse"
                          items={courseItems}
                          value={sharedCourseId}
                          onChange={setSharedCourseId}
                          placeholder="Sök kurskod eller namn..."
                          emptyText="Inga kurser hittades"
                        />
                      </div>
                    )}

                    {linkType === "program" && (
                      <div className="mt-1 flex flex-col gap-3 sm:flex-row">
                        <div className="flex-1">
                          <label className="sr-only" htmlFor="program">
                            Program
                          </label>
                          <SearchSelect
                            id="program"
                            items={programItems}
                            value={programId}
                            onChange={handleProgramChange}
                            placeholder="Sök program..."
                            emptyText="Inga program hittades"
                          />
                        </div>
                        {selectedProgram && selectedProgram.years > 1 && (
                          <div className="sm:w-36">
                            <label className="sr-only" htmlFor="year">
                              Årskurs
                            </label>
                            <select
                              id="year"
                              className={INPUT_CLASSES}
                              value={year ?? ""}
                              onChange={(e) =>
                                setYear(
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value)
                                )
                              }
                            >
                              <option value="" disabled>
                                Årskurs
                              </option>
                              {Array.from(
                                { length: selectedProgram.years },
                                (_, i) => i + 1
                              ).map((y) => (
                                <option key={y} value={y}>
                                  År {y}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </fieldset>

                  <div className="flex flex-col gap-2">
                    <span className={LABEL_CLASSES}>Böcker</span>
                    {books.map((book, index) => (
                      <div
                        key={book.id}
                        className="flex flex-col gap-2 rounded-lg border border-[var(--sky-blue)] p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[var(--navy)]">
                            Bok {index + 1}
                          </span>
                          {books.length > MIN_BOOKS && (
                            <button
                              type="button"
                              aria-label={`Ta bort bok ${index + 1}`}
                              onClick={() => removeBook(book.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-[var(--navy)] transition-colors hover:bg-[var(--sky-blue)]/10"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <label className="sr-only" htmlFor={`book-${book.id}-title`}>
                          Titel för bok {index + 1}
                        </label>
                        <input
                          id={`book-${book.id}-title`}
                          type="text"
                          aria-required="true"
                          className={INPUT_CLASSES}
                          placeholder="Bokens titel"
                          value={book.title}
                          onChange={(e) =>
                            updateBook(book.id, { title: e.target.value })
                          }
                        />

                        {linkType === "course" && (
                          <div className="relative">
                            <label
                              className="sr-only"
                              htmlFor={`book-${book.id}-course`}
                            >
                              Kurs för bok {index + 1}
                            </label>
                            <SearchSelect
                              id={`book-${book.id}-course`}
                              items={courseItems}
                              value={book.courseId}
                              onChange={(id) =>
                                updateBook(book.id, { courseId: id })
                              }
                              placeholder="Sök kurskod eller namn..."
                              emptyText="Inga kurser hittades"
                            />
                          </div>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="sm:w-40">
                            <label
                              className="sr-only"
                              htmlFor={`book-${book.id}-condition`}
                            >
                              Skick för bok {index + 1}
                            </label>
                            <select
                              id={`book-${book.id}-condition`}
                              className={INPUT_CLASSES}
                              value={book.condition}
                              onChange={(e) =>
                                updateBook(book.id, {
                                  condition: e.target.value,
                                })
                              }
                            >
                              {CONDITIONS.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label
                              className="sr-only"
                              htmlFor={`book-${book.id}-isbn`}
                            >
                              ISBN för bok {index + 1} (valfritt)
                            </label>
                            <input
                              id={`book-${book.id}-isbn`}
                              type="text"
                              className={INPUT_CLASSES}
                              placeholder="978-..."
                              value={book.isbn}
                              onChange={(e) =>
                                updateBook(book.id, { isbn: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          ISBN är valfritt och står oftast på bokens insida.
                        </p>
                      </div>
                    ))}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={addBook}
                        disabled={books.length >= MAX_BOOKS}
                        className="rounded-lg border border-[var(--sky-blue)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--kth-blue)] transition-colors hover:bg-[var(--sky-blue)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        + Lägg till bok
                      </button>
                      <span className="text-sm text-gray-500">
                        {books.length} av {MAX_BOOKS} böcker
                      </span>
                    </div>
                  </div>
                </>
              )}

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

              {mode === "single" && (
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
              )}

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

              {mode === "single" && (
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
              )}

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
