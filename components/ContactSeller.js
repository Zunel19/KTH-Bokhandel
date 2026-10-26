"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PRIMARY_CLASSES =
  "flex h-12 items-center justify-center rounded-lg bg-[var(--kth-blue)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]";
const SECONDARY_CLASSES =
  "rounded-lg border border-[var(--kth-blue)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--kth-blue)] transition-colors hover:bg-[var(--kth-blue)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-[var(--kth-blue)]";
const DEFAULT_TEXT = "Hej! Är den här fortfarande till salu?";
const MAX_LENGTH = 1000;
const SHOW_COUNTER_FROM = 900;

// Kontaktdelen på annonssidan. Visar olika saker beroende på om besökaren är
// säljaren, utloggad eller redan har en konversation om annonsen.
export default function ContactSeller({
  listingId,
  sellerId,
  sellerUsername,
  status,
}) {
  const router = useRouter();
  // "checking", "seller", "loggedOut" eller "buyer".
  const [viewer, setViewer] = useState("checking");
  const [conversationId, setConversationId] = useState(null);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (cancelled) return;

      if (!userId) {
        setViewer("loggedOut");
        return;
      }
      if (userId === sellerId) {
        setViewer("seller");
        return;
      }

      const { data, error } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error("Kunde inte kolla konversationer:", error);

      setConversationId(data?.id ?? null);
      setViewer("buyer");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [listingId, sellerId]);

  // Fokusera rutan med texten markerad när den öppnas.
  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, [open]);

  function handleCancel() {
    setOpen(false);
    setText(DEFAULT_TEXT);
    setError(null);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);

    const { data, error } = await supabase.rpc("start_conversation", {
      p_listing_id: listingId,
      p_body: text,
    });

    if (error) {
      if (error.code === "P0001") {
        setError(error.message);
      } else {
        console.error("Kunde inte starta konversationen:", error);
        setError("Något gick fel, försök igen.");
      }
      setSending(false);
      return;
    }
    // sending ligger kvar tills sidan byts.
    router.push(`/meddelanden/${data}`);
  }

  if (viewer === "checking") {
    return <div className="h-12" aria-hidden="true" />;
  }

  if (viewer === "seller") {
    return (
      <Link
        href="/meddelanden"
        className="self-start text-sm text-[var(--kth-blue)] hover:underline"
      >
        Se dina meddelanden →
      </Link>
    );
  }

  if (conversationId) {
    return (
      <Link href={`/meddelanden/${conversationId}`} className={PRIMARY_CLASSES}>
        Gå till konversationen
      </Link>
    );
  }

  if (status === "såld") {
    return (
      <p className="text-sm text-[var(--navy)]">Den här annonsen är såld.</p>
    );
  }

  if (viewer === "loggedOut") {
    return (
      <Link href="/logga-in" className={PRIMARY_CLASSES}>
        Kontakta säljaren
      </Link>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="kontakta-saljaren"
        className={PRIMARY_CLASSES}
      >
        Kontakta säljaren
      </button>

      {open && (
        <form
          id="kontakta-saljaren"
          onSubmit={handleSend}
          className="mt-3 flex flex-col gap-2 rounded-lg border border-[var(--sky-blue)] bg-white p-4"
        >
          <label
            htmlFor="kontakta-saljaren-text"
            className="text-sm font-medium text-[var(--navy)]"
          >
            Skriv till {sellerUsername}
          </label>
          <textarea
            ref={textareaRef}
            id="kontakta-saljaren-text"
            rows={3}
            maxLength={MAX_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-y rounded-lg border border-[var(--sky-blue)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]"
          />
          {text.length > SHOW_COUNTER_FROM && (
            <p className="self-end text-xs text-gray-500">
              {text.length}/{MAX_LENGTH}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-[var(--kth-blue)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--kth-blue)]"
            >
              {sending ? "Skickar..." : "Skicka"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={sending}
              className={SECONDARY_CLASSES}
            >
              Avbryt
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
