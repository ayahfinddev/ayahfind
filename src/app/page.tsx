import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata: Metadata = {
  title: "AyahFind — Find the verse you remember",
  description:
    "AyahFind is a Qur'an search engine that understands how people actually remember verses — by meaning, English wording, Arabic text or sound. Search 6,236 ayat, then read, listen and explore tafsir.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AyahFind — Find the verse you remember",
    description:
      "A Qur'an search engine that understands meaning, wording and sound. Search 6,236 ayat, then read, listen and explore tafsir.",
    url: "/",
    siteName: "AyahFind",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AyahFind — Find the verse you remember",
    description:
      "A Qur'an search engine that understands meaning, wording and sound.",
  },
};

export default function HomePage() {
  return <MarketingPage />;
}
