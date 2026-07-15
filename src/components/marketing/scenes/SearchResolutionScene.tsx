"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { DemoResultCard } from "../DemoResultCard";
import { VERSE_27_88 } from "../verses";
import { useMarketingMotion } from "../useMarketingMotion";

/** The hero query, split into the fragments the engine actually weighs. */
const FRAGMENTS = [
  { text: "mountains", signal: "semantic", x: -220, y: -120, rotate: -6 },
  { text: "move", signal: "lexical", x: 200, y: -150, rotate: 5 },
  { text: "like clouds", signal: "semantic", x: -180, y: 130, rotate: 4 },
  // The Arabic chip never rotates or tilts — Qur'anic words move upright only.
  { text: "ٱلْجِبَال", signal: "arabic", x: 230, y: 110, rotate: 0, ar: true },
];

/** Scene 2 — the result. The query separates into weighted fragments that
 * drift inward as the visitor scrolls and resolve into the real 27:88
 * result card. Reversible; static under reduced motion. */
export function SearchResolutionScene() {
  const { reduced, desktop } = useMarketingMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Fragments: scattered → converge on centre → fade as the card resolves.
  const convergence = useTransform(scrollYProgress, [0.05, 0.5], [1, 0]);
  const fragmentOpacity = useTransform(scrollYProgress, [0, 0.12, 0.42, 0.56], [0, 1, 1, 0]);

  // Card: emerges from the convergence point.
  const cardOpacity = useTransform(scrollYProgress, [0.5, 0.64], [0, 1]);
  const cardScale = useTransform(scrollYProgress, [0.5, 0.72], [0.92, 1]);
  const cardY = useTransform(scrollYProgress, [0.5, 0.72], [40, 0]);

  const headerOpacity = useTransform(scrollYProgress, [0.02, 0.14, 0.46, 0.58], [0, 1, 1, 0]);
  const refOpacity = useTransform(scrollYProgress, [0.68, 0.8], [0, 1]);

  if (reduced) {
    return (
      <section className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-text-tertiary">
          The result
        </h2>
        <p className="mt-3 font-serif text-3xl text-text md:text-4xl">
          Meaning is enough.
        </p>
        <div className="mt-10 w-full text-left">
          <DemoResultCard verse={VERSE_27_88} />
        </div>
        <p className="mt-4 text-sm text-text-tertiary">
          Qur&rsquo;an 27:88 · Surah An-Naml
        </p>
      </section>
    );
  }

  return (
    <section ref={ref} className={desktop ? "relative h-[320vh]" : "relative h-[230vh]"}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <motion.h2
          style={{ opacity: headerOpacity }}
          className="absolute top-[16vh] text-center font-serif text-2xl text-text-secondary md:text-4xl"
        >
          Your words become signals.
        </motion.h2>

        {/* Query fragments converging on the centre */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {FRAGMENTS.map((f) => (
            <Fragment key={f.text} f={f} convergence={convergence} opacity={fragmentOpacity} desktop={desktop} />
          ))}
        </div>

        {/* The resolved verse */}
        <motion.div
          style={{ opacity: cardOpacity, scale: cardScale, y: cardY }}
          className="relative z-10 w-full max-w-2xl"
        >
          <DemoResultCard verse={VERSE_27_88} compact={!desktop} />
          <motion.p
            style={{ opacity: refOpacity }}
            className="mt-4 text-center text-sm text-text-tertiary"
          >
            Qur&rsquo;an 27:88 · Surah An-Naml — found from meaning alone.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

function Fragment({
  f,
  convergence,
  opacity,
  desktop,
}: {
  f: (typeof FRAGMENTS)[number];
  convergence: MotionValue<number>;
  opacity: MotionValue<number>;
  desktop: boolean;
}) {
  const scaleFactor = desktop ? 1 : 0.55;
  const x = useTransform(convergence, (c) => f.x * scaleFactor * c);
  const y = useTransform(convergence, (c) => f.y * scaleFactor * c);
  const rotate = useTransform(convergence, (c) => f.rotate * c);

  return (
    <motion.div
      style={{ x, y, rotate, opacity }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <span
        className={
          "flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 shadow-sm " +
          (f.ar ? "font-arabic text-lg text-text" : "text-sm font-medium text-text")
        }
        dir={f.ar ? "rtl" : undefined}
      >
        {f.text}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {f.signal}
        </span>
      </span>
    </motion.div>
  );
}
