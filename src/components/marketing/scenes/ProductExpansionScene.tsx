"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  BookOpenText,
  Copy,
  Headphones,
  Layers,
  History,
} from "lucide-react";
import { useMarketingMotion } from "../useMarketingMotion";

/** Every entry here is a shipped feature of the /search app — reader,
 * per-verse audio, tafsir panels, qira'at readings, copy/share, and
 * Continue Reading. Nothing aspirational. */
const FEATURES = [
  {
    icon: BookOpen,
    title: "Read in context",
    desc: "Open any result in a full Qur'an reader and keep reading from that ayah.",
  },
  {
    icon: Headphones,
    title: "Listen",
    desc: "Verse-by-verse recitation with your choice of reciter, right from the result card.",
  },
  {
    icon: BookOpenText,
    title: "Tafsir",
    desc: "Classical commentary opens beside the verse — understand it, don't just find it.",
  },
  {
    icon: Layers,
    title: "Qira'at",
    desc: "Where canonical readings differ, see each riwayah clearly labelled.",
  },
  {
    icon: Copy,
    title: "Copy & share",
    desc: "Share a verse with its translation and a direct link in one tap.",
  },
  {
    icon: History,
    title: "Continue Reading",
    desc: "AyahFind remembers where you stopped and takes you straight back.",
  },
];

/** Scene 4 — beyond a search result. A deliberately quiet typography
 * section between two cinematic pins: simple viewport-entry reveals, no
 * scroll scrubbing. */
export function ProductExpansionScene() {
  const { reduced } = useMarketingMotion();

  const reveal = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: false, amount: 0.4 },
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <section className="mx-auto max-w-5xl px-6 py-28 md:py-40">
      <motion.div {...reveal} className="max-w-2xl">
        <h2 className="font-serif text-3xl leading-tight text-text md:text-5xl">
          Finding the verse is the beginning.
        </h2>
        <p className="mt-4 text-base text-text-secondary md:text-lg">
          Every result opens into the rest of AyahFind — reading, listening,
          understanding and returning.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-3 sm:grid-cols-2 md:mt-16 md:gap-4 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              {...(reduced
                ? {}
                : {
                    initial: { opacity: 0, y: 20 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: false, amount: 0.3 },
                    transition: {
                      duration: 0.5,
                      delay: (i % 3) * 0.08,
                      ease: [0.16, 1, 0.3, 1] as const,
                    },
                  })}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-surface text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-text">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{f.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
