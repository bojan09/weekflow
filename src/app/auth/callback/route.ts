import { NextResponse } from "next/server";
import { completeGoogleSignIn } from "@/server/google-oauth";
import { siteOrigin } from "@/server/http";

export async function GET(request: Request) {
  const origin = siteOrigin(request);
  let destination: string;
  try { destination = await completeGoogleSignIn(new URL(request.url).searchParams); }
  catch { destination = "/sign-in?error=google"; }
  // Never render callback tokens, or carry them into the destination URL.
  const response = NextResponse.redirect(new URL(destination, origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
