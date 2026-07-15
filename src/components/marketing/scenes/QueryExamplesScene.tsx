"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { DemoSearchBar } from "../DemoSearchBar";
import { EXAMPLE_QUERIES, type ExampleQuery } from "../verses";
import { useMarketingMotion } from "../useMarketingMotion";

/** Scene 5 — search beyond exact wording. A pinned search bar cycles
 * through real half-remembered queries (English meaning, an Arabic
 * fragment, a transliteration) and each resolves into the real verse it
 * finds. Scroll-scrubbed and reversible. */
export function QueryExamplesScene() {
  const { reduced, desktop } = useMarketingMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const headingOpacity = useTransform(scrollYProgress, [0.02, 0.1], [0, 1]);

  if (reduced) {
    return (
      <section className="mx-auto min-h-screen max-w-3xl px-6 py-24">
        <SceneHeading />
        <div className="mt-12 space-y-8">
          {EXAMPLE_QUERIES.map((ex) => (
            <div key={ex.query}>
              <DemoSearchBar query={ex.query} dir={ex.dir} active />
              <ResolvedRow ex={ex} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className={desktop ? "relative h-[380vh]" : "relative h-[300vh]"}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <motion.div style={{ opacity: headingOpacity }}>
          <SceneHeading />
        </motion.div>

        <div className="relative mt-10 w-full max-w-2xl">
          {EXAMPLE_QUERIES.map((ex, i) => (
            <ExampleSlide
              key={ex.query}
              ex={ex}
              index={i}
              total={EXAMPLE_QUERIES.length}
              progress={scrollYProgress}
            />
          ))}
          {/* Spacer keeping the stacked absolute slides from collapsing */}
          <div className="invisible" aria-hidden="true">
            <DemoSearchBar query="placeholder" />
            <div className="mt-4 h-24" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SceneHeading() {
  return (
    <div className="text-center">
      <h2 className="font-serif text-3xl leading-tight text-text md:text-5xl">
        You don&rsquo;t need the exact words.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-sm text-text-secondary md:text-base">
        A meaning, a fragment, a sound — whatever stayed with you is enough.
      </p>
    </div>
  );
}

function ExampleSlide({
  ex,
  index,
  total,
  progress,
}: {
  ex: ExampleQuery;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  // Slides share the band [0.15, 0.95] of the pin, one window each.
  const band = 0.8 / total;
  const start = 0.15 + index * band;
  const end = start + band;
  const fade = band * 0.18;

  const opacity = useTransform(
    progress,
    index === 0
      ? [start - 0.05, start, end - fade, end]
      : [start, start + fade, end - fade, end],
    index === total - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0]
  );
  const y = useTransform(progress, [start, start + fade], [18, 0]);
  const resultOpacity = useTransform(
    progress,
    [start + band * 0.35, start + band * 0.55],
    [0, 1]
  );
  const resultY = useTransform(
    progress,
    [start + band * 0.35, start + band * 0.55],
    [12, 0]
  );

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 top-0">
      <DemoSearchBar query={ex.query} dir={ex.dir} active />
      <motion.div style={{ opacity: resultOpacity, y: resultY }}>
        <ResolvedRow ex={ex} />
      </motion.div>
    </motion.div>
  );
}

function ResolvedRow({ ex }: { ex: ExampleQuery }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <span className="mt-0.5 shrink-0 rounded-full bg-accent-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
        {ex.kindLabel}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Qur&rsquo;an {ex.verse.surah}:{ex.verse.ayah} · {ex.verse.surahName}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
          {ex.verse.translationEn}
        </p>
      </div>
    </div>
  );
}
