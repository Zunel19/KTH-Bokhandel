"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const INPUT_CLASSES =
  "w-full rounded-lg border border-[var(--sky-blue)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export default function ValkommenPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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

      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        router.replace("/");
        return;
      }

      setLoading(false);
    }

    checkSessionAndProfile();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError(
        "Användarnamnet måste vara 3–20 tecken och får bara innehålla bokstäver, siffror och understreck."
      );
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, username: trimmed });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Det användarnamnet är redan taget, välj ett annat.");
      } else {
        setError("Något gick fel, försök igen.");
      }
      setSaving(false);
      return;
    }

    setSaving(false);
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--sand)] px-6 py-12">
        <p className="text-sm text-gray-500">Laddar...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--sand)] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-black/5 bg-white p-8 shadow-sm">
          <h1 className="mb-2 font-serif text-3xl text-[var(--navy)]">
            Välkommen!
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            Välj ett användarnamn som andra studenter kommer se på dina annonser.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Användarnamn"
              className={INPUT_CLASSES}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)] disabled:opacity-60"
            >
              {saving ? "Sparar..." : "Spara och fortsätt"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
