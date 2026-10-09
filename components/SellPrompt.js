"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SellPrompt() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStatus("first");
        return;
      }

      const { count, error } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", session.user.id);

      if (error) {
        setStatus("returning");
      } else {
        setStatus(count > 0 ? "returning" : "first");
      }
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === "checking") {
    return <div className="mt-10 h-5" aria-hidden="true" />;
  }

  return (
    <div className="mt-10 flex items-center justify-center gap-1.5 text-sm">
      <span className="text-gray-500">Har du böcker att sälja?</span>
      <Link
        href="/skapa-annons"
        className="font-medium text-[var(--kth-blue)] hover:underline"
      >
        {status === "first" ? "Skapa din första annons →" : "Lägg upp en annons →"}
      </Link>
    </div>
  );
}
