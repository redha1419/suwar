import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { redirect } from "next/navigation";

export interface SessionData {
  ownerId?: string;
  email?: string;
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be set and at least 32 characters");
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "suwar_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/** Throws (via redirect) if there is no logged-in owner; otherwise returns the session. Use in pages/layouts. */
export async function requireOwner() {
  const session = await getSession();
  if (!session.ownerId) {
    redirect("/login");
  }
  return session;
}

/** Returns the owner id for API routes, or null — never redirects (redirect() breaks JSON/fetch clients). */
export async function getOwnerIdForApi(): Promise<string | null> {
  const session = await getSession();
  return session.ownerId ?? null;
}
