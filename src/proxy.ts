import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userSettings } from "@/db/schema";
import { localeCookieName } from "@/i18n/request";

const isProtectedRoute = createRouteMatcher(["/starters(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // A device/browser with no locale cookie yet (e.g. first visit from a new
  // phone) falls back to English even if the signed-in account has Hebrew
  // saved — sync the cookie from the account's stored preference once so
  // every subsequent request on this device renders in the right language.
  if (!req.cookies.has(localeCookieName)) {
    const { userId } = await auth();
    if (userId) {
      const db = getDb();
      const [row] = await db
        .select({ language: userSettings.language })
        .from(userSettings)
        .where(eq(userSettings.userId, userId));

      if (row) {
        const response = NextResponse.next();
        response.cookies.set(localeCookieName, row.language, {
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
        });
        return response;
      }
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
