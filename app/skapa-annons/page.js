"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const MEETING_POINTS = ["Biblioteket", "Kårhuset", "Drottning Kristinas väg"];

const INPUT_CLASSES =
  "w-full rounded-lg border border-[var(--sky-blue)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";

const LABEL_CLASSES = "text-sm font-medium text-[var(--navy)]";

export default function SkapaAnnonsPage() {
  const [courseQuery, setCourseQuery] = useState("");
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  const [meetingPoint, setMeetingPoint] = useState(MEETING_POINTS[0]);
  const [customMeetingPoint, setCustomMeetingPoint] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

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
            .includes(courseQuery.toLowerCase())
        );

  function handleCourseSelect(course) {
    setCourseQuery(`${course.code} — ${course.name}`);
    setSelectedCourseId(course.id);
    setShowCourseDropdown(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
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
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLASSES} htmlFor="condition">
              Skick
            </label>
            <select id="condition" className={INPUT_CLASSES} defaultValue="Nyskick">
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
            <input id="isbn" type="text" className={INPUT_CLASSES} placeholder="978-..." />
            <p className="text-xs text-gray-500">
              Hittas vanligtvis på bokens insida, t.ex. på andra sidan
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLASSES} htmlFor="images">
              Bilder
            </label>
            <input
              id="images"
              type="file"
              multiple
              accept="image/*"
              className="text-sm text-[var(--navy)]"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]"
          >
            Lägg upp annons
          </button>

          {submitted && (
            <p className="text-sm text-[var(--kth-blue)]">
              Sparas snart! (Funktion kommer när inloggning är klar)
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
