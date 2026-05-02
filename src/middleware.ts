import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const COOKIE_NAME = "portx-session";
const COMPANY_COOKIE = "portx-company";
const PROJECT_ID = "portxhub";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/setup", "/api/auth/logout"];

// Paths that need a session but not an active company (so the user can pick one)
const COMPANY_EXEMPT_PATHS = ["/select-company", "/api/companies", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const activeCompany = request.cookies.get(COMPANY_COOKIE)?.value;
  const isExempt = COMPANY_EXEMPT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!activeCompany && !isExempt) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "No active company selected" },
        { status: 412 }
      );
    }
    return NextResponse.redirect(new URL("/select-company", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
