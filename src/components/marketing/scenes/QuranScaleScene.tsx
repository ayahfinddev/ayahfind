"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { SURAH_CATALOG } from "../verses";
import { useMarketingMotion } from "../useMarketingMotion";

const TOTAL_AYAT = 6236;
const TARGET = { surah: 27, ayah: 88 }; // the dot the sweep resolves to

/** Precomputed dot grid: one dot per ayah, laid out in reading order and
 * wrapped into rows — a clean information-visualisation, not a graph (no
 * edges between verses). Returns positions in unit space [0,1]. */
function buildDots() {
  const cols = 114; // fixed column count keeps rows aligned and calm
  const dots: { x: number; y: number; isTarget: boolean }[] = [];
  let i = 0;
  let targetIndex = 0;
  for (const s of SURAH_CATALOG) {
    for (let a = 1; a <= s.c; a++) {
      if (s.n === TARGET.surah && a === TARGET.ayah) targetIndex = i;
      dots.push({
        x: (i % cols) / (cols - 1),
        y: Math.floor(i / cols),
        isTarget: s.n === TARGET.surah && a === TARGET.ayah,
      });
      i++;
    }
  }
  const rows = Math.ceil(i / cols);
  for (const d of dots) d.y = d.y / (rows - 1);
  return { dots, targetIndex };
}

/** Scene 6 — the scale. All 6,236 ayat drawn as a structured field of
 * points on a canvas; scrolling sweeps the field into view, then a single
 * gold point — the verse you were looking for — resolves out of it. */
export function QuranScaleScene() {
  const { reduced, desktop } = useMarketingMotion();
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<ReturnType<typeof buildDots> | null>(null);
  const progressRef = useRef(0);
  const rafRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const textOpacity = useTransform(scrollYProgress, [0.55, 0.7], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.55, 0.7], [24, 0]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!dotsRef.current) dotsRef.current = buildDots();
    const { dots } = dotsRef.current;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const p = progressRef.current;
    // Sweep: dots appear top-to-bottom across the first 60% of the pin.
    const sweep = Math.min(1, Math.max(0, p / 0.6));
    // Resolve: after 65%, the field dims slightly and the target glows.
    const resolve = Math.min(1, Math.max(0, (p - 0.65) / 0.25));

    const padX = w * 0.08;
    const padY = h * 0.14;
    const fieldW = w - padX * 2;
    const fieldH = h - padY * 2;
    const r = Math.max(0.8, Math.min(1.6, fieldW / 300));

    for (const d of dots) {
      const visible = d.y <= sweep;
      if (!visible) continue;
      const edge = Math.min(1, (sweep - d.y) * 12); // soft leading edge
      const alpha = (0.1 + 0.16 * edge) * (1 - resolve * 0.55);
      ctx.fillStyle = d.isTarget
        ? `rgba(197, 161, 91, ${Math.max(alpha, resolve)})`
        : `rgba(115, 167, 129, ${alpha})`;
      const x = padX + d.x * fieldW;
      const y = padY + d.y * fieldH;
      const radius = d.isTarget ? r + resolve * 3 : r;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (d.isTarget && resolve > 0) {
        ctx.strokeStyle = `rgba(197, 161, 91, ${0.5 * resolve})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r + 6 + resolve * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  // Redraw only when scroll progress actually changes, coalesced to one
  // frame — no continuous animation loop runs while the scene is idle.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v <= 0 || v >= 1) {
      // Draw the terminal frame once, then stay idle while off-screen.
      progressRef.current = v <= 0 ? 0 : 1;
    } else {
      progressRef.current = v;
    }
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  });

  useEffect(() => {
    if (reduced) return;
    // First paint + repaint on resize.
    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  if (reduced) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        <ScaleHeading />
      </section>
    );
  }

  return (
    <section ref={ref} className={desktop ? "relative h-[280vh]" : "relative h-[200vh]"}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        />
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="relative z-10 px-6 text-center"
        >
          <ScaleHeading />
        </motion.div>
      </div>
    </section>
  );
}

function ScaleHeading() {
  return (
    <>
      <h2 className="font-serif text-4xl leading-tight text-text md:text-6xl">
        6,236 ayat.
      </h2>
      <p className="mt-3 font-serif text-2xl text-text-secondary md:text-4xl">
        Find the one you remember.
      </p>
    </>
  );
}
