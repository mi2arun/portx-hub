import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";

const COOKIE_NAME = "portx-session";
const COMPANY_COOKIE_NAME = "portx-company";

export async function createSession(idToken: string) {
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
  cookieStore.delete(COMPANY_COOKIE_NAME);
}

export async function hasUsers(): Promise<boolean> {
  const result = await adminAuth.listUsers(1);
  return result.users.length > 0;
}

export async function setActiveCompany(companyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COMPANY_COOKIE_NAME, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getActiveCompanyId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COMPANY_COOKIE_NAME)?.value || null;
}

export async function clearActiveCompany() {
  const cookieStore = await cookies();
  cookieStore.delete(COMPANY_COOKIE_NAME);
}

export async function requireActiveCompanyId(): Promise<string> {
  const id = await getActiveCompanyId();
  if (!id) throw new Error("NO_ACTIVE_COMPANY");
  return id;
}
