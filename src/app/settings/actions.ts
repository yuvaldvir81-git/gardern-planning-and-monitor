"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "../starters/actions";
import { localeCookieName, type Locale } from "@/i18n/request";

export async function getUserLanguage(): Promise<Locale> {
  const userId = await requireUserId();
  const db = getDb();

  const [row] = await db
    .select({ language: userSettings.language })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  return row?.language ?? "en";
}

export async function setUserLanguage(language: Locale) {
  const userId = await requireUserId();
  const db = getDb();

  await db
    .insert(userSettings)
    .values({ userId, language })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { language, updatedAt: new Date() },
    });

  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, language, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
