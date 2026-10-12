"use client";

import { useState, useEffect, useRef } from "react";

const SWIPE_THRESHOLD = 40;

function SoldBadge() {
  return (
    <span className="pointer-events-none absolute left-3 top-3 z-[1] rounded-full bg-[var(--navy)] px-2.5 py-0.5 text-xs font-medium text-white">
      Såld
    </span>
  );
}

export default function ListingGallery({ images, title, sold }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const count = images.length;

  // Förladda grannbilderna så att bläddring känns omedelbar.
  useEffect(() => {
    [index - 1, index + 1].forEach((i) => {
      if (i >= 0 && i < count) {
        const img = new Image();
        img.src = images[i].image_url;
      }
    });
  }, [index, count, images]);

  if (count === 0) {
    return (
      <div className="relative aspect-[4/3] w-full rounded-lg border border-black/5 bg-[var(--kth-blue)]/10">
        {sold && <SoldBadge />}
      </div>
    );
  }

  const hasPrev = index > 0;
  const hasNext = index < count - 1;

  function goTo(i) {
    setIndex(Math.max(0, Math.min(count - 1, i)));
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowLeft" && hasPrev) {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === "ArrowRight" && hasNext) {
      e.preventDefault();
      goTo(index + 1);
    }
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx > SWIPE_THRESHOLD && hasPrev) goTo(index - 1);
    else if (dx < -SWIPE_THRESHOLD && hasNext) goTo(index + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        tabIndex={0}
        role="group"
        aria-label="Bildgalleri"
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-black/5 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kth-blue)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index].image_url}
          alt={`${title} (bild ${index + 1} av ${count})`}
          fetchPriority={index === 0 ? "high" : "auto"}
          decoding="async"
          className="h-full w-full object-contain"
        />

        {sold && <SoldBadge />}

        {count > 1 && (
          <>
            {hasPrev && (
              <button
                type="button"
                aria-label="Föregående bild"
                onClick={() => goTo(index - 1)}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--navy)] shadow transition-colors hover:bg-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                aria-label="Nästa bild"
                onClick={() => goTo(index + 1)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--navy)] shadow transition-colors hover:bg-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto p-1">
          {images.map((image, i) => (
            <button
              key={image.image_url}
              type="button"
              aria-label={`Visa bild ${i + 1} av ${count}`}
              aria-current={i === index ? true : undefined}
              onClick={() => goTo(i)}
              className={`shrink-0 overflow-hidden rounded-md ${
                i === index
                  ? "ring-2 ring-[var(--kth-blue)]"
                  : "ring-1 ring-[var(--sky-blue)]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-16 w-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
