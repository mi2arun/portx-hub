import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";

const COOKIE_NAME = "portx-session";

export async function createSession(idToken: string) {
  // Verify the ID token and set it as a cookie
  await adminAuth.verifyIdToken(idToken);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, idToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession(): Promise<{ uid: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || "" };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function hasUsers(): Promise<boolean> {
  const result = await adminAuth.listUsers(1);
  return result.users.length > 0;
}
