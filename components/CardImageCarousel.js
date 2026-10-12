"use client";

import { useState } from "react";

// Bildyta för annonskort: staplade bilder med prickar för bläddring.
// Ligger ofta inuti en länk, så klick på en prick får inte öppna länken.
// images: [{ image_url, thumb_url, position }]. children: överlägg, t.ex.
// etiketter, som renderas ovanpå bilderna men under prickarna.
// imagesClassName: läggs på lagret med bilderna (t.ex. för att tona ned dem
// utan att tona ned etiketter och prickar).
export default function CardImageCarousel({
  images: rawImages,
  title,
  className = "aspect-square w-full",
  imagesClassName = "",
  style,
  children,
}) {
  // Sorterade efter position, lägst först.
  const images = [...(rawImages ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => image.thumb_url || image.image_url)
    .filter(Boolean);

  // selected: senast klickade bilden. preview: bilden under muspekaren.
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState(null);
  // Övriga bilder hämtas först när någon interagerar med kortet.
  const [loadAll, setLoadAll] = useState(false);
  const shown = preview ?? selected;

  return (
    // Bilderna om annonsen har några, annars syns bakgrunden som platshållare.
    <div
      className={`group relative overflow-hidden ${className}`}
      style={style}
      onPointerEnter={() => images.length > 1 && setLoadAll(true)}
    >
      <div className={`absolute inset-0 ${imagesClassName}`}>
        {images.map((src, index) =>
          index === 0 || loadAll ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={index === 0 ? title : `${title} (bild ${index + 1})`}
              aria-hidden={index === shown ? undefined : "true"}
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
                index === shown ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null,
        )}
      </div>

      {children}

      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <div className="flex items-center rounded-full bg-black/30 px-1.5 py-0.5 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-has-[:focus-visible]:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                aria-label={`Visa bild ${index + 1} av ${images.length}`}
                aria-current={index === selected ? true : undefined}
                onMouseEnter={() => setPreview(index)}
                onMouseLeave={() => setPreview(null)}
                onClick={(e) => {
                  // Kortet är en länk: ett klick eller tryck på en prick
                  // ska bara byta bild, inte öppna annonsen.
                  e.preventDefault();
                  e.stopPropagation();
                  setSelected(index);
                  setLoadAll(true);
                }}
                className="rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  className={`block h-2 w-2 rounded-full transition-colors ${
                    index === shown ? "bg-white" : "bg-white/50"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
