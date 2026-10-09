"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const INPUT_CLASSES =
  "w-full rounded-lg border border-[var(--sky-blue)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]";

// MAGIC LINK-INLOGGNING — sparad till senare, används inte just nu
//
// State:
//   const [email, setEmail] = useState("");
//   const [submitted, setSubmitted] = useState(false);
//
// async function handleSubmit(e) {
//   e.preventDefault();
//   setError(null);
//
//   const { error } = await supabase.auth.signInWithOtp({
//     email,
//     options: {
//       emailRedirectTo: `${window.location.origin}/valkommen`,
//     },
//   });
//
//   if (error) {
//     setError(error.message);
//   } else {
//     setSubmitted(true);
//   }
// }
//
// JSX inuti kortet:
//   {submitted ? (
//     <div className="flex flex-col items-center gap-3 py-4 text-center">
//       <svg
//         xmlns="http://www.w3.org/2000/svg"
//         fill="none"
//         viewBox="0 0 24 24"
//         strokeWidth={1.5}
//         stroke="currentColor"
//         className="h-10 w-10 text-[var(--kth-blue)]"
//         aria-hidden="true"
//       >
//         <path
//           strokeLinecap="round"
//           strokeLinejoin="round"
//           d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
//         />
//       </svg>
//       <p className="text-sm text-[var(--navy)]">
//         Kolla din inkorg! Vi har skickat en inloggningslänk till{" "}
//         <span className="font-medium">{email}</span>.
//       </p>
//     </div>
//   ) : (
//     <>
//       <h1 className="mb-2 font-serif text-3xl text-[var(--navy)]">
//         Logga in
//       </h1>
//       <p className="mb-6 text-sm text-gray-500">
//         Ange din @kth.se-mejladress så skickar vi en inloggningslänk till
//         dig.
//       </p>
//       <form onSubmit={handleSubmit} className="flex flex-col gap-4">
//         <input
//           type="email"
//           required
//           placeholder="dittnamn@kth.se"
//           className={INPUT_CLASSES}
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//         />
//         <button
//           type="submit"
//           className="rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)]"
//         >
//           Skicka länk
//         </button>
//
//         {error && (
//           <p className="text-sm text-red-600">{error}</p>
//         )}
//       </form>
//     </>
//   )}

export default function LoggaInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Något gick fel, försök igen.");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });

      if (error) {
        console.error("Kunde inte spara sessionen:", error);
        setError("Något gick fel, försök igen.");
      } else {
        router.replace("/valkommen");
      }
    } catch {
      setError("Kunde inte nå servern, försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--sand)] px-6 py-12">
      <div className="w-full max-w-sm">
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

        <div className="rounded-lg border border-black/5 bg-white p-8 shadow-sm">
          <h1 className="mb-2 font-serif text-3xl text-[var(--navy)]">
            Logga in
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            Ange ditt användarnamn eller din @kth.se-mejladress, och ditt
            lösenord.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="Användarnamn eller mejladress"
              className={INPUT_CLASSES}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Lösenord"
                className={INPUT_CLASSES}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Link
                href="/glomt-losenord"
                className="self-end text-sm text-[var(--kth-blue)] hover:underline"
              >
                Glömt lösenord?
              </Link>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[var(--kth-blue)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--navy)] disabled:opacity-60"
            >
              {loading ? "Loggar in..." : "Logga in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Har du inget konto?{" "}
            <Link
              href="/skapa-konto"
              className="text-[var(--kth-blue)] hover:underline"
            >
              Skapa konto
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
