"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  Fragment,
} from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import {
  CONVERSATION_SELECT,
  counterpart,
  listingThumb,
  formatClock,
  dayLabel,
  isSameDayIso,
} from "@/lib/messages";

const MESSAGE_SELECT = "id, sender_id, body, created_at";
const MAX_LENGTH = 1000;
const SHOW_COUNTER_FROM = 900;
// Skrivrutan växer upp till 5 rader (radhöjd 20 px + 2 × 10 px padding + ram).
const TEXTAREA_MAX_HEIGHT = 5 * 20 + 20 + 2;
const NEAR_BOTTOM_PX = 120;
const POLL_INTERVAL_MS = 20000;
const READ_THROTTLE_MS = 1000;

// Slår ihop meddelanden utan dubbletter, sorterade efter tid.
function mergeMessages(prev, incoming) {
  const byId = new Map(prev.map((m) => [m.id, m]));
  let changed = false;
  for (const m of incoming) {
    if (!byId.has(m.id)) {
      byId.set(m.id, m);
      changed = true;
    }
  }
  if (!changed) return prev;
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
}

function distanceFromBottom() {
  return (
    document.documentElement.scrollHeight -
    (window.scrollY + window.innerHeight)
  );
}

function scrollToBottom(smooth) {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: smooth && !reduceMotion ? "smooth" : "auto",
  });
}

function BackArrow({ href, children }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-1 self-start text-sm text-[var(--navy)] transition-colors hover:text-[var(--kth-blue)] hover:underline"
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
      {children}
    </Link>
  );
}

export default function ChattPage() {
  const router = useRouter();
  const { id } = useParams();

  const [userId, setUserId] = useState(null);
  // undefined = laddar, null = finns inte (eller användaren deltar inte).
  const [conversation, setConversation] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [showNewButton, setShowNewButton] = useState(false);

  const textareaRef = useRef(null);
  const lastIdRef = useRef(null);
  const nearBottomRef = useRef(true);
  const readRef = useRef({ last: 0, timer: null });

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      console.error("Kunde inte hämta meddelanden:", error);
      return;
    }
    setMessages((prev) => mergeMessages(prev, data));
  }, [id]);

  // Markerar konversationen som läst, högst ett anrop per sekund. Anrop som
  // kommer för tätt slås ihop till ett när sekunden har gått.
  const markRead = useCallback(() => {
    const state = readRef.current;
    if (state.timer) return;
    const call = async () => {
      state.timer = null;
      state.last = Date.now();
      const { error } = await supabase.rpc("mark_conversation_read", {
        p_conversation_id: id,
      });
      if (error) console.error("Kunde inte markera som läst:", error);
    };
    const wait = READ_THROTTLE_MS - (Date.now() - state.last);
    if (wait <= 0) call();
    else state.timer = setTimeout(call, wait);
  }, [id]);

  useEffect(() => {
    const state = readRef.current;
    return () => clearTimeout(state.timer);
  }, []);

  // Inloggning, konversationen och meddelandena.
  useEffect(() => {
    let cancelled = false;

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

      const [conversationResult, messagesResult] = await Promise.all([
        supabase
          .from("conversations")
          .select(CONVERSATION_SELECT)
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("messages")
          .select(MESSAGE_SELECT)
          .eq("conversation_id", id)
          .order("created_at", { ascending: true })
          .limit(500),
      ]);
      if (cancelled) return;

      // Ogiltigt id ger ett fel och behandlas som "finns inte".
      if (conversationResult.error) {
        console.error("Kunde inte hämta konversationen:", conversationResult.error);
      }
      if (messagesResult.error) {
        console.error("Kunde inte hämta meddelanden:", messagesResult.error);
      }

      setUserId(user.id);
      setMessages((prev) => mergeMessages(prev, messagesResult.data ?? []));
      setConversation(conversationResult.data ?? null);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const ready = Boolean(userId && conversation);

  // Realtime, skyddsnät med omhämtning och läst-markering.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let channel = null;

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      // Realtime behöver sessionens token för att RLS ska släppa igenom meddelandena.
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`messages:${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${id}`,
          },
          (payload) => {
            const m = payload.new;
            setMessages((prev) =>
              mergeMessages(prev, [
                {
                  id: m.id,
                  sender_id: m.sender_id,
                  body: m.body,
                  created_at: m.created_at,
                },
              ])
            );
          }
        )
        .subscribe((status) => {
          // Hämta det som kan ha kommit in innan prenumerationen var igång.
          if (status === "SUBSCRIBED") fetchMessages();
        });
    }

    subscribe();
    markRead();

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") fetchMessages();
    }, POLL_INTERVAL_MS);
    window.addEventListener("focus", markRead);

    return () => {
      cancelled = true;
      clearInterval(poll);
      window.removeEventListener("focus", markRead);
      if (channel) supabase.removeChannel(channel);
    };
  }, [ready, id, fetchMessages, markRead]);

  // Håll koll på om användaren är nära botten.
  useEffect(() => {
    function handleScroll() {
      nearBottomRef.current = distanceFromBottom() <= NEAR_BOTTOM_PX;
      if (nearBottomRef.current) setShowNewButton(false);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Nytt sista meddelande: scrolla ned, eller visa knappen om användaren
  // läser längre upp. Markera som läst om motparten skrev.
  useLayoutEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    const first = lastIdRef.current === null;
    lastIdRef.current = last.id;

    const mine = last.sender_id === userId;
    if (!mine && !first && document.visibilityState === "visible") {
      markRead();
    }

    if (first) {
      scrollToBottom(false);
      // Next.js kan scrolla till toppen efter monteringen, så upprepa.
      const frame = requestAnimationFrame(() => scrollToBottom(false));
      return () => cancelAnimationFrame(frame);
    }
    if (mine || nearBottomRef.current) {
      scrollToBottom(true);
    } else {
      setShowNewButton(true);
    }
  }, [messages, userId, markRead]);

  // Skrivrutan växer med texten upp till 5 rader.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
    el.style.overflowY =
      el.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  }, [text, ready]);

  async function handleSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: userId, body })
      .select(MESSAGE_SELECT)
      .single();

    if (error) {
      console.error("Kunde inte skicka meddelandet:", error);
      setSendError("Meddelandet kunde inte skickas, försök igen.");
    } else {
      setMessages((prev) => mergeMessages(prev, [data]));
      setText("");
    }
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  if (conversation === undefined) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--sand)] px-6 py-12">
        <p className="text-sm text-gray-500">Laddar...</p>
      </main>
    );
  }

  if (conversation === null) {
    return (
      <main className="min-h-screen bg-[var(--sand)]">
        <div className="mx-auto flex max-w-3xl flex-col px-6 py-8">
          <BackArrow href="/meddelanden">Meddelanden</BackArrow>
          <p className="text-sm text-[var(--navy)]">
            Konversationen finns inte.{" "}
            <Link
              href="/meddelanden"
              className="text-[var(--kth-blue)] hover:underline"
            >
              Till dina meddelanden
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const other = counterpart(conversation, userId);
  const otherName = other?.username ?? "Okänd";
  const listing = conversation.listings;
  const deleted = conversation.listing_id === null;
  const title = listing?.title ?? conversation.listing_title;
  const thumb = listingThumb(conversation);
  const isSold = listing?.status === "såld";
  const canSend = text.trim() !== "" && !sending;

  return (
    <main className="flex flex-1 flex-col bg-[var(--sand)]">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-8">
        <BackArrow href="/meddelanden">Meddelanden</BackArrow>

        <div className="flex gap-3 rounded-lg border border-black/5 bg-white p-3">
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
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-medium text-[var(--navy)]">
                {title}
              </p>
              {isSold && (
                <span className="shrink-0 rounded-full bg-[var(--navy)] px-2.5 py-0.5 text-xs font-medium text-white">
                  Såld
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-[var(--kth-blue)]">
              {`${conversation.listing_price} kr`}
            </p>
            {deleted ? (
              <p className="text-sm text-gray-500">Annonsen är borttagen</p>
            ) : (
              listing && (
                <Link
                  href={`/annons/${listing.id}`}
                  className="self-start text-sm text-[var(--kth-blue)] hover:underline"
                >
                  Visa annons
                </Link>
              )
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Avatar seed={other?.id} name={otherName} size={28} />
          <span className="text-sm font-medium text-[var(--navy)]">
            {otherName}
          </span>
        </div>

        <div
          role="log"
          aria-live="polite"
          className="flex flex-1 flex-col gap-2 py-6"
        >
          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              Inga meddelanden än.
            </p>
          )}
          {messages.map((message, index) => {
            const mine = message.sender_id === userId;
            const newDay =
              index === 0 ||
              !isSameDayIso(messages[index - 1].created_at, message.created_at);
            return (
              <Fragment key={message.id}>
                {newDay && (
                  <p className="my-2 text-center text-xs text-gray-500">
                    {dayLabel(message.created_at)}
                  </p>
                )}
                <div
                  className={`flex flex-col gap-0.5 ${
                    mine ? "items-end" : "items-start"
                  }`}
                >
                  <p
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-[var(--kth-blue)] text-white"
                        : "border border-black/5 bg-white text-[var(--navy)]"
                    }`}
                  >
                    {message.body}
                  </p>
                  <span className="text-[11px] text-gray-400">
                    {formatClock(message.created_at)}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-[var(--sand)] pt-3 pb-4">
          {showNewButton && (
            <button
              type="button"
              onClick={() => {
                setShowNewButton(false);
                scrollToBottom(true);
              }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-full border border-[var(--sky-blue)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--kth-blue)] shadow-sm transition-colors hover:bg-[var(--sky-blue)]/10"
            >
              Nya meddelanden ↓
            </button>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={MAX_LENGTH}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv ett meddelande..."
              aria-label="Meddelande"
              className="flex-1 resize-none rounded-lg border border-[var(--sky-blue)] bg-white px-4 py-2.5 text-sm leading-5 text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-lg bg-[var(--kth-blue)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--kth-blue)]"
            >
              Skicka
            </button>
          </form>
          {(sendError || text.length > SHOW_COUNTER_FROM) && (
            <div className="mt-1.5 flex items-start gap-3">
              {sendError && (
                <p className="text-sm text-red-600" role="alert">
                  {sendError}
                </p>
              )}
              {text.length > SHOW_COUNTER_FROM && (
                <p className="ml-auto text-xs text-gray-500">
                  {text.length}/{MAX_LENGTH}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
