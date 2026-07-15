"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Sparkles } from "lucide-react";
import { IslamicPatternBg } from "@/components/home/IslamicPatternBg";
import { DemoSearchBar } from "../DemoSearchBar";
import { useMarketingMotion } from "../useMarketingMotion";

export const HERO_QUERY = "the mountains move like clouds";

/** Scroll-scrubbed character reveal — the query "types" itself as the
 * visitor scrolls, and un-types when they scroll back up. */
function TypedQuery({ progress }: { progress: MotionValue<number> }) {
  const chars = useTransform(progress, (p) =>
    HERO_QUERY.slice(0, Math.round(p * HERO_QUERY.length))
  );
  const caretVisible = useTransform(progress, (p): number => (p > 0.02 && p < 1 ? 1 : 0));

  return <DemoSearchBarWithMotionQuery chars={chars} caretVisible={caretVisible} />;
}

function DemoSearchBarWithMotionQuery({
  chars,
  caretVisible,
}: {
  chars: MotionValue<string>;
  caretVisible: MotionValue<number>;
}) {
  return (
    <div
      aria-hidden="true"
      className="search-glow-static relative overflow-hidden rounded-[20px] bg-surface shadow-md"
    >
      <div className="flex h-14 items-center gap-3 px-5 md:h-16 md:gap-4 md:px-7">
        <Sparkles className="h-5 w-5 shrink-0 text-primary-hover md:h-6 md:w-6" />
        <div className="flex h-8 flex-1 items-center overflow-hidden whitespace-nowrap text-base leading-6 text-text md:text-xl">
          <motion.span>{chars}</motion.span>
          <motion.span
            style={{ opacity: caretVisible }}
            className="demo-caret ml-0.5 inline-block h-5 w-px bg-primary md:h-6"
          />
        </div>
        <span className="hidden h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-white shadow-sm sm:flex">
          Search
        </span>
      </div>
    </div>
  );
}

/** Scene 1 — the problem. Pinned, scroll-scrubbed:
 * "You remember the meaning." → "But not where it is." → the AyahFind
 * search bar rises in front of the dimming typography and the query types
 * itself in. Fully reversible; static single-screen layout under
 * prefers-reduced-motion. */
export function HeroProblemScene() {
  const { reduced, desktop } = useMarketingMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Line 1: masked wipe in on load (so the fold is never blank), then the
  // scroll scrub drifts it up and dims it as the search bar arrives.
  const l1Opacity = useTransform(scrollYProgress, [0.55, 0.75], [1, 0.22]);
  const l1Y = useTransform(scrollYProgress, [0.5, 0.9], ["0%", "-46%"]);
  const l1Blur = useTransform(scrollYProgress, [0.55, 0.85], ["blur(0px)", "blur(5px)"]);

  // Line 2: follows, then drifts behind the bar too.
  const l2Clip = useTransform(scrollYProgress, [0.2, 0.36], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  const l2Opacity = useTransform(scrollYProgress, [0.18, 0.24, 0.6, 0.8], [0, 1, 1, 0.28]);
  const l2Y = useTransform(scrollYProgress, [0.5, 0.9], ["0%", "-30%"]);

  // Search bar: rises from below, passing in front of the type.
  const barY = useTransform(scrollYProgress, [0.42, 0.62], ["46vh", "0vh"]);
  const barOpacity = useTransform(scrollYProgress, [0.42, 0.52], [0, 1]);
  const barScale = useTransform(scrollYProgress, [0.42, 0.62], [0.96, 1]);
  const typing = useTransform(scrollYProgress, [0.62, 0.94], [0, 1], { clamp: true });

  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [0.7, 0]);
  const glowOpacity = useTransform(scrollYProgress, [0.4, 0.7], [0.14, 0.32]);

  if (reduced) {
    return (
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center">
        <HeroBackdrop staticGlow />
        <h1 className="max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight text-text md:text-6xl">
          You remember the meaning.
          <br />
          <span className="text-text-secondary">But not where it is.</span>
        </h1>
        <div className="mt-12 w-full max-w-2xl">
          <DemoSearchBar query={HERO_QUERY} active className="shadow-md" />
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className={desktop ? "relative h-[340vh]" : "relative h-[240vh]"}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <HeroBackdrop glowOpacity={glowOpacity} />

        {/* Typography layer — sits behind the arriving search bar */}
        <div className="relative z-0 flex flex-col items-center text-center">
          {/* Outer element plays the one-time masked entrance; the inner
           * element carries the scroll-scrubbed exit so the two never fight
           * over the same style channel. */}
          <motion.div
            initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.h1
              style={{ opacity: l1Opacity, y: l1Y, filter: l1Blur }}
              className="font-serif text-4xl font-medium leading-tight tracking-tight text-text md:text-6xl lg:text-7xl"
            >
              You remember the meaning.
            </motion.h1>
          </motion.div>
          <motion.p
            style={{ clipPath: l2Clip, opacity: l2Opacity, y: l2Y }}
            className="mt-4 font-serif text-3xl font-medium leading-tight tracking-tight text-text-secondary md:text-5xl lg:text-6xl"
          >
            But not where it is.
          </motion.p>
        </div>

        {/* Search bar layer — passes in front of the typography */}
        <motion.div
          style={{ y: barY, opacity: barOpacity, scale: barScale }}
          className="relative z-10 mt-10 w-full max-w-2xl"
        >
          <TypedQuery progress={typing} />
        </motion.div>

        <motion.p
          style={{ opacity: hintOpacity }}
          className="absolute bottom-8 text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary"
          aria-hidden="true"
        >
          Scroll
        </motion.p>
      </div>
    </section>
  );
}

function HeroBackdrop({
  glowOpacity,
  staticGlow,
}: {
  glowOpacity?: MotionValue<number>;
  staticGlow?: boolean;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <IslamicPatternBg className="absolute inset-0 h-full w-full opacity-[0.025]" color="var(--primary)" />
      <motion.div
        style={{
          opacity: staticGlow ? 0.2 : glowOpacity,
          background:
            "radial-gradient(ellipse 55% 45% at 50% 58%, rgba(197, 161, 91, 0.35), transparent 70%)",
        }}
        className="absolute inset-0"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
      />
    </div>
  );
}
