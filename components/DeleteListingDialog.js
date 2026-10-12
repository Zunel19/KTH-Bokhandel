"use client";

import { useEffect, useRef } from "react";

// Bekräftelsedialog för att ta bort en annons.
export default function DeleteListingDialog({
  title,
  open,
  onCancel,
  onConfirm,
  busy,
  error,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function cancel() {
    if (!busy) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-title"
      onCancel={(e) => {
        // Esc: föräldern bestämmer när dialogen stängs.
        e.preventDefault();
        cancel();
      }}
      onClick={(e) => {
        // Klick på bakgrunden (själva dialog-elementet) stänger.
        if (e.target === dialogRef.current) cancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-black/5 bg-white p-0 shadow-md backdrop:bg-black/40"
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <h2 id="delete-title" className="font-serif text-2xl text-[var(--navy)]">
            Ta bort annonsen?
          </h2>
          <p className="text-sm text-[var(--navy)]">
            ”{title}” och dess bilder tas bort för gott. Det går inte att ångra.
          </p>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              disabled={busy}
              onClick={cancel}
              className="rounded-lg border border-[var(--kth-blue)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--kth-blue)] transition-colors hover:bg-[var(--kth-blue)] hover:text-white disabled:opacity-60"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:opacity-60"
            >
              {busy ? "Tar bort..." : "Ta bort"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
