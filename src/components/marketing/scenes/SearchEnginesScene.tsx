"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Brain, CaseSensitive, Languages, AudioLines } from "lucide-react";
import { useMarketingMotion } from "../useMarketingMotion";

const STREAMS = [
  {
    icon: Brain,
    title: "Meaning",
    desc: "Understands what you meant, not just the words you typed.",
    example: "“mountains moving like clouds”",
  },
  {
    icon: CaseSensitive,
    title: "English words",
    desc: "Matches the translation wording you half-remember.",
    example: "“pass as the passing of clouds”",
  },
  {
    icon: Languages,
    title: "Arabic text",
    desc: "Finds the exact Arabic letters, with or without diacritics.",
    example: "وترى الجبال",
    ar: true,
  },
  {
    icon: AudioLines,
    title: "How it sounds",
    desc: "Forgives imperfect spelling of Arabic you heard, not read.",
    example: "“wa taral jibal”",
  },
];

/** Scene 3 — how AyahFind searches. Four independent streams light up one
 * by one as the visitor scrolls, then converge into a single ranked
 * answer. */
export function SearchEnginesScene() {
  const { reduced, desktop } = useMarketingMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const titleOpacity = useTransform(scrollYProgress, [0.02, 0.1], [0, 1]);
  const titleY = useTransform(scrollYProgress, [0.02, 0.1], [24, 0]);

  // Streams converge: cards slide toward the centre line and compress.
  const convergeStart = 0.62;
  const convergence = useTransform(scrollYProgress, [convergeStart, 0.86], [0, 1]);
  const answerOpacity = useTransform(scrollYProgress, [0.78, 0.9], [0, 1]);
  const answerY = useTransform(scrollYProgress, [0.78, 0.9], [24, 0]);
  const gridOpacity = useTransform(scrollYProgress, [convergeStart + 0.12, 0.86], [1, 0]);

  if (reduced) {
    return (
      <section className="mx-auto min-h-screen max-w-4xl px-6 py-24">
        <SceneHeading />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {STREAMS.map((s) => (
            <StreamCard key={s.title} s={s} />
          ))}
        </div>
        <ConvergedAnswer className="mt-8" />
      </section>
    );
  }

  return (
    <section ref={ref} className={desktop ? "relative h-[300vh]" : "relative h-[220vh]"}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <motion.div style={{ opacity: titleOpacity, y: titleY }}>
          <SceneHeading />
        </motion.div>

        <motion.div
          style={{ opacity: gridOpacity }}
          className="mt-10 grid w-full max-w-4xl gap-3 sm:grid-cols-2 md:gap-4"
        >
          {STREAMS.map((s, i) => (
            <AnimatedStreamCard
              key={s.title}
              s={s}
              index={i}
              progress={scrollYProgress}
              convergence={convergence}
              desktop={desktop}
            />
          ))}
        </motion.div>

        <motion.div
          style={{ opacity: answerOpacity, y: answerY }}
          className="absolute w-full max-w-xl px-6"
        >
          <ConvergedAnswer />
        </motion.div>
      </div>
    </section>
  );
}

function SceneHeading() {
  return (
    <div className="text-center">
      <h2 className="font-serif text-3xl leading-tight text-text md:text-5xl">
        Different ways of remembering.
        <br />
        <span className="text-highlight">One way to find it.</span>
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm text-text-secondary md:text-base">
        Four search engines read your query at once — meaning, English wording, Arabic
        text and Arabic sound — and agree on a single ranked answer.
      </p>
    </div>
  );
}

function StreamCard({ s }: { s: (typeof STREAMS)[number] }) {
  const Icon = s.icon;
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-surface text-primary">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <h3 className="text-sm font-semibold text-text">{s.title}</h3>
      </div>
      <p className="mt-3 text-sm text-text-secondary">{s.desc}</p>
      <p
        className={
          "mt-3 inline-block rounded-lg bg-surface-secondary px-3 py-1.5 text-xs text-text-tertiary " +
          (s.ar ? "font-arabic text-sm" : "")
        }
        dir={s.ar ? "rtl" : undefined}
        lang={s.ar ? "ar" : undefined}
      >
        {s.example}
      </p>
    </div>
  );
}

function AnimatedStreamCard({
  s,
  index,
  progress,
  convergence,
  desktop,
}: {
  s: (typeof STREAMS)[number];
  index: number;
  progress: MotionValue<number>;
  convergence: MotionValue<number>;
  desktop: boolean;
}) {
  // Each stream reveals in sequence over the first two-thirds of the pin,
  // then converges toward the centre (left column drifts right, right column
  // left) as the single ranked answer takes over.
  const start = 0.12 + index * 0.1;
  const opacity = useTransform(progress, [start, start + 0.07], [0, 1]);
  const dirX = desktop ? (index % 2 === 0 ? 1 : -1) : 0;
  const dirY = index < 2 ? 1 : -1;
  const revealY = useTransform(progress, [start, start + 0.07], [28, 0]);
  const y = useTransform<number, number>([revealY, convergence], ([r, c]) => r + dirY * c * 60);
  const x = useTransform(convergence, (c) => dirX * c * 120);
  const scale = useTransform(convergence, (c) => 1 - c * 0.12);

  return (
    <motion.div style={{ opacity, y, x, scale }}>
      <StreamCard s={s} />
    </motion.div>
  );
}

function ConvergedAnswer({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "rounded-xl border border-highlight-border bg-surface-elevated p-5 text-center shadow-md " +
        className
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-highlight">
        One ranked answer
      </p>
      <p className="mt-2 text-sm text-text">
        All four signals fuse into a single confidence score — the verse you meant,
        first.
      </p>
      <p className="mt-3 text-xs text-text-tertiary">Qur&rsquo;an 27:88 · 96% match</p>
    </div>
  );
}
