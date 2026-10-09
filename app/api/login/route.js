import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CLIENT_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false },
};

function invalidCredentials() {
  return NextResponse.json(
    { error: "Fel användarnamn, mejladress eller lösenord." },
    { status: 401 }
  );
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return invalidCredentials();
  }

  const { identifier, password } = body ?? {};
  if (
    typeof identifier !== "string" ||
    typeof password !== "string" ||
    identifier.trim() === "" ||
    password === ""
  ) {
    return invalidCredentials();
  }

  // Den hemliga nyckeln används bara här på servern.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY saknas i .env.local");
    return NextResponse.json(
      { error: "Serverfel, försök igen senare." },
      { status: 500 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    CLIENT_OPTIONS
  );
  const admin = createClient(supabaseUrl, serviceRoleKey, CLIENT_OPTIONS);

  const trimmed = identifier.trim();
  let email;

  if (trimmed.includes("@")) {
    email = trimmed.toLowerCase();
  } else {
    const pattern = trimmed.replace(/[\\_%]/g, (c) => `\\${c}`);
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, username")
      .ilike("username", pattern);

    if (profileError) {
      console.error("Kunde inte slå upp användarnamn:", profileError);
      return NextResponse.json(
        { error: "Serverfel, försök igen senare." },
        { status: 500 }
      );
    }

    const profile = profiles?.find(
      (p) => p.username?.toLowerCase() === trimmed.toLowerCase()
    );
    if (!profile) {
      return invalidCredentials();
    }

    const { data: userData } = await admin.auth.admin.getUserById(profile.id);
    if (!userData?.user?.email) {
      return invalidCredentials();
    }
    email = userData.user.email;
  }

  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message?.includes("Email not confirmed")) {
      return NextResponse.json(
        { error: "Du har inte bekräftat din mejladress än." },
        { status: 401 }
      );
    }
    if (error.code !== "invalid_credentials" && error.status !== 400) {
      console.error("Oväntat fel vid inloggning:", error.message);
    }
    return invalidCredentials();
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
