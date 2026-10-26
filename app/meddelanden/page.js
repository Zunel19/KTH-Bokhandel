"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import {
  CONVERSATION_SELECT,
  isUnread,
  counterpart,
  listingThumb,
  formatMessageTime,
} from "@/lib/messages";

// Vänta så här länge efter en ändring innan listan hämtas om, så att flera
// ändringar i rad bara ger en hämtning.
const REFETCH_DEBOUNCE_MS = 300;

function SkeletonRow() {
  return (
    <div className="flex animate-pulse gap-3 rounded-lg border border-black/5 bg-white p-3">
      <div className="h-16 w-16 shrink-0 rounded-md bg-gray-200" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <div className="h-4 w-1/2 rounded bg-gray-200" />
        <div className="h-3 w-1/3 rounded bg-gray-200" />
        <div className="h-3 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function ConversationRow({ conversation, userId }) {
  const other = counterpart(conversation, userId);
  const otherName = other?.username ?? "Okänd";
  const listing = conversation.listings;
  const deleted = conversation.listing_id === null;
  const title = listing?.title ?? conversation.listing_title;
  const thumb = listingThumb(conversation);
  const unread = isUnread(conversation, userId);
  const iWroteLast = conversation.last_message_sender_id === userId;

  return (
    <Link
      href={`/meddelanden/${conversation.id}`}
      className="flex gap-3 rounded-lg border border-black/5 bg-white p-3 transition-shadow hover:shadow-sm"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          className="h-16 w-16 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-md bg-[var(--sky-blue)]/20" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={`truncate text-sm text-[var(--navy)] ${
              unread ? "font-semibold" : "font-medium"
            }`}
          >
            {title}
          </p>
          <span className="shrink-0 text-xs text-gray-500">
            {formatMessageTime(conversation.last_message_at)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Avatar seed={other?.id} name={otherName} size={20} />
          <span className="text-xs text-[var(--navy)]">{otherName}</span>
          <span className="text-xs text-gray-500">
            · {conversation.buyer_id === userId ? "Du köper" : "Du säljer"}
          </span>
          {deleted && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              Annonsen är borttagen
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p
            className={`line-clamp-1 flex-1 text-sm ${
              unread ? "font-semibold text-[var(--navy)]" : "text-gray-600"
            }`}
          >
            {conversation.last_message_preview
              ? `${iWroteLast ? "Du: " : ""}${conversation.last_message_preview}`
              : ""}
          </p>
          {unread && (
            <span
              role="img"
              aria-label="Oläst"
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--kth-blue)]"
            />
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MeddelandenPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let channel = null;
    let debounceTimer = null;

    async function fetchConversations() {
      const { data, error } = await supabase
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (cancelled) return;

      if (error) {
        console.error("Kunde inte hämta konversationer:", error);
        // En lista som redan visas ligger kvar om en omhämtning misslyckas.
        if (!loadedRef.current) {
          setError("Kunde inte hämta dina meddelanden just nu.");
        }
        return;
      }
      loadedRef.current = true;
      setError(null);
      setConversations(data);
    }

    function scheduleRefetch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchConversations, REFETCH_DEBOUNCE_MS);
    }

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (cancelled) return;

      if (!user) {
        router.replace("/logga-in");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (!profile) {
        router.replace("/valkommen");
        return;
      }

      setUserId(user.id);
      fetchConversations();

      // Realtime behöver sessionens token för att RLS ska släppa igenom ändringar.
      supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`conversations:${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          scheduleRefetch
        )
        .subscribe();
    }

    init();
    window.addEventListener("focus", scheduleRefetch);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      window.removeEventListener("focus", scheduleRefetch);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  let content;
  if (error) {
    content = <p className="text-sm text-red-600">{error}</p>;
  } else if (conversations === null) {
    content = (
      <div className="flex flex-col gap-3" aria-busy="true">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  } else if (conversations.length === 0) {
    content = (
      <p className="text-sm text-gray-500">
        Du har inga meddelanden än.{" "}
        <Link href="/" className="text-[var(--kth-blue)] hover:underline">
          Till startsidan
        </Link>
      </p>
    );
  } else {
    content = (
      <ul className="flex flex-col gap-3">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <ConversationRow conversation={conversation} userId={userId} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--sand)]">
      <div className="mx-auto max-w-3xl px-6 py-8">
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

        <h1 className="mb-6 font-serif text-3xl text-[var(--navy)]">
          Meddelanden
        </h1>

        {content}
      </div>
    </main>
  );
}
