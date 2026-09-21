import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, heIL } from "@clerk/localizations";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
// Imported globally, not inside the map component: that component loads via
// next/dynamic(ssr:false), so its own CSS import ships as part of a lazily
// fetched chunk with no server-render pass to discover it up front. Under
// real network latency (unlike localhost) that chunk's CSS sometimes lost
// the race against first paint, leaving the map invisible on Vercel only.
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const dir = locale === "he" ? "rtl" : "ltr";

  return (
    <ClerkProvider afterSignOutUrl="/" localization={locale === "he" ? heIL : enUS}>
      <html
        lang={locale}
        dir={dir}
        className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <NextIntlClientProvider messages={messages}>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
