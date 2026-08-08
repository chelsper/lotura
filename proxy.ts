import { NextRequest, NextResponse } from "next/server";

import { resolveAuthenticationConfiguration } from "@/lib/authentication-policy.mjs";
import {
  SESSION_COOKIE_NAME,
  verifySignedSession,
} from "@/lib/authentication-session.mjs";
import {
  resolveOperatingModelConfiguration,
} from "@/lib/process-explorer-source-policy.mjs";

function unavailable() {
  return new NextResponse("The workspace is temporarily unavailable.", {
    headers: { "Cache-Control": "no-store" },
    status: 503,
  });
}

function isAuthenticationPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

export async function proxy(request: NextRequest) {
  let authentication;

  try {
    const operatingModel = resolveOperatingModelConfiguration(process.env);
    authentication = resolveAuthenticationConfiguration(
      process.env,
      operatingModel,
    );
  } catch {
    return unavailable();
  }

  const authenticationPath = isAuthenticationPath(request.nextUrl.pathname);
  if (authentication.mode === "public") {
    if (authenticationPath) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const session = await verifySignedSession(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    {
      maximumDurationSeconds: authentication.sessionDurationSeconds,
      secret: authentication.sessionSecret,
    },
  );

  if (authenticationPath) {
    if (request.nextUrl.pathname === "/login" && session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/login", request.url);
    if (request.method === "GET" || request.method === "HEAD") {
      login.searchParams.set(
        "returnTo",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
