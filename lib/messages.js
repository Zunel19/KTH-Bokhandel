// Hjälpfunktioner för direktmeddelanden (inkorgen och chatten).

// Samma select används i inkorgen och chatten.
export const CONVERSATION_SELECT =
  "id, listing_id, buyer_id, seller_id, listing_title, listing_price, last_message_at, last_message_sender_id, last_message_preview, buyer_last_read_at, seller_last_read_at, buyer:profiles!conversations_buyer_id_fkey(id, username), seller:profiles!conversations_seller_id_fkey(id, username), listings(id, title, status, listing_images(thumb_url, image_url, position))";

// Sant om motparten skrev senast och användaren inte har läst det.
export function isUnread(conversation, userId) {
  const sender = conversation.last_message_sender_id;
  if (!sender || sender === userId) return false;
  const lastRead =
    conversation.buyer_id === userId
      ? conversation.buyer_last_read_at
      : conversation.seller_last_read_at;
  if (!lastRead) return true;
  return new Date(lastRead) < new Date(conversation.last_message_at);
}

export function countUnread(conversations, userId) {
  return conversations.filter((c) => isUnread(c, userId)).length;
}

// Motparten i konversationen ({ id, username } eller null).
export function counterpart(conversation, userId) {
  return conversation.buyer_id === userId
    ? conversation.seller
    : conversation.buyer;
}

// Annonsens första bild (miniatyr i första hand), eller null.
export function listingThumb(conversation) {
  const images = [...(conversation.listings?.listing_images ?? [])].sort(
    (a, b) => a.position - b.position
  );
  return images[0] ? images[0].thumb_url || images[0].image_url : null;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date, now) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameDay(date, yesterday);
}

// "14:05" (HH:MM).
export function formatClock(isoString) {
  return new Date(isoString).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Samma dag "14:05", i går "i går", samma år "12 okt", annars "12 okt 2025".
export function formatMessageTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  if (isSameDay(date, now)) return formatClock(isoString);
  if (isYesterday(date, now)) return "i går";
  const options =
    date.getFullYear() === now.getFullYear()
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" };
  // Vissa webbläsare skriver "okt." med punkt.
  return date.toLocaleDateString("sv-SE", options).replace(/\./g, "");
}

// Datumavdelare i chatten: "Idag", "I går" eller "12 oktober 2026".
export function dayLabel(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  if (isSameDay(date, now)) return "Idag";
  if (isYesterday(date, now)) return "I går";
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isSameDayIso(a, b) {
  return isSameDay(new Date(a), new Date(b));
}
