"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { useMarketingMotion } from "../useMarketingMotion";

/** Scene 7 — everything quiets down. Wordmark, one line, two buttons.
 * Includes the #download anchor ("Mobile apps coming soon" — no app store
 * pages exist yet) and the page footer. */
export function FinalCTA() {
  const { reduced } = useMarketingMotion();

  const reveal = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: false, amount: 0.5 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <>
      {/* Download anchor — honest "coming soon", not a fake store badge */}
      <section id="download" className="mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
        <motion.div {...reveal()}>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-surface text-primary">
            <Smartphone className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-text md:text-2xl">
            Mobile apps coming soon
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            AyahFind for iOS and Android is in development. Until then, the web app
            works beautifully on your phone.
          </p>
        </motion.div>
      </section>

      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 50% 55%, rgba(115, 167, 129, 0.1), transparent 70%)",
          }}
        />

        <motion.p
          {...reveal()}
          className="text-sm font-semibold uppercase tracking-[0.25em] text-highlight"
        >
          AyahFind
        </motion.p>
        <motion.h2
          {...reveal(0.08)}
          className="mt-5 max-w-2xl font-serif text-3xl leading-tight text-text md:text-5xl"
        >
          Islamic knowledge should be easy to find.
        </motion.h2>

        <motion.div {...reveal(0.16)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/search"
            className="btn-press rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-md transition-colors duration-150 hover:bg-primary-hover"
          >
            Try AyahFind
          </Link>
          <Link
            href="/about"
            className="btn-press rounded-xl border border-border-strong bg-surface px-7 py-3.5 text-base font-medium text-text transition-colors duration-150 hover:bg-surface-secondary"
          >
            Learn more
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-text-tertiary md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-white">
              A
            </span>
            <span className="font-medium text-text-secondary">AyahFind</span>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-5">
            <Link href="/search" className="transition-colors hover:text-text">
              Search
            </Link>
            <Link href="/about" className="transition-colors hover:text-text">
              About
            </Link>
            <a href="#download" className="transition-colors hover:text-text">
              Download
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
