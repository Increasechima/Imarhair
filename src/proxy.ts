import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = ["/account", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

// Session refresh + coarse route protection. This is a convenience layer:
// pages and server actions re-check auth (and admin role) themselves.
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search, searchParams } = request.nextUrl;

  // Supabase Auth reports OAuth/email-link failures by redirecting to the Site
  // URL with ?error=…&error_code=…. Without this they land silently on the home
  // page; send them to sign-in with a message instead.
  const authErrorCode = searchParams.get("error_code") ?? (searchParams.has("error_description") ? searchParams.get("error") : null);
  if (authErrorCode && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?error=${authErrorReason(authErrorCode)}`;
    return withCookies(NextResponse.redirect(url), response);
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return withCookies(NextResponse.redirect(url), response);
  }

  if (userId && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }

  return response;
}

function authErrorReason(code: string): "oauth_expired" | "oauth_cancelled" | "link_expired" | "auth" {
  switch (code) {
    case "bad_oauth_state":
    case "bad_oauth_callback":
    case "flow_state_expired":
    case "flow_state_not_found":
      return "oauth_expired";
    case "access_denied":
      return "oauth_cancelled";
    case "otp_expired":
      return "link_expired";
    default:
      return "auth";
  }
}

// Carry refreshed auth cookies over to a redirect response.
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export const config = {
  matcher: [
    // Everything except static assets, image optimisation, metadata files and webhooks.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|brand/|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
