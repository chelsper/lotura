import { NextRequest, NextResponse } from "next/server";

import {
  createTemporarySessionToken,
  resolveRuntimeAccessConfiguration,
  SESSION_COOKIE_NAME,
  verifyTemporaryCredentials,
} from "@/lib/authentication";
import { safeReturnPath } from "@/lib/authentication-policy.mjs";

export const runtime = "nodejs";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function redirectToLogin(request: NextRequest, returnTo: string) {
  const destination = new URL("/login", request.url);
  destination.searchParams.set("error", "invalid");
  if (returnTo !== "/") destination.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(destination, 303);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return new NextResponse("Request rejected.", { status: 403 });
  }
  if (
    !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded") ||
    Number(request.headers.get("content-length") || 0) > 4096
  ) {
    return new NextResponse("Request rejected.", { status: 400 });
  }

  const { authentication } = resolveRuntimeAccessConfiguration();
  if (authentication.mode !== "temporary-password") {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new NextResponse("Request rejected.", { status: 400 });
  }

  const returnTo = safeReturnPath(formData.get("returnTo"));
  const accepted = await verifyTemporaryCredentials(
    authentication,
    formData.get("identifier"),
    formData.get("password"),
  );
  if (!accepted) return redirectToLogin(request, returnTo);

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(
    SESSION_COOKIE_NAME,
    await createTemporarySessionToken(authentication),
    {
      httpOnly: true,
      maxAge: authentication.sessionDurationSeconds,
      path: "/",
      sameSite: "lax",
      secure: true,
    },
  );
  return response;
}
