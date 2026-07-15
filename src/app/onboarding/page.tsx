"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Brain, Languages, Shield } from "lucide-react";

const slides = [
  {
    icon: Mic,
    title: "Voice search",
    body: "Recite imperfectly. Mispronounce. Stop halfway. AyahFind still understands.",
  },
  {
    icon: Brain,
    title: "Meaning-based search",
    body: "Describe what you remember in English or Arabic — we find the ayah semantically.",
  },
  {
    icon: Languages,
    title: "Error-tolerant AI",
    body: "Typos, mixed language, vague wording — our engine is built for human imperfection.",
  },
  {
    icon: Shield,
    title: "Microphone access",
    body: "Enable the mic for immersive voice search. Audio stays on-device when possible.",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const Slide = slides[step].icon;

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ayahfind_onboarded", "1");
    }
    router.push("/search");
  };

  return (
    <motion.div
      className="flex min-h-dvh flex-col px-6 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-surface ring-1 ring-accent-border shadow-[0_2px_12px_var(--accent-border)]"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Slide className="h-12 w-12 text-accent-dim" />
            </motion.div>
            <h1 className="text-2xl font-bold text-ink">{slides[step].title}</h1>
            <p className="mt-4 max-w-sm text-ink-muted">{slides[step].body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mb-4 flex justify-center gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-8 bg-primary-hover" : "w-1.5 bg-border-strong"
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => (step < slides.length - 1 ? setStep(step + 1) : finish())}
        className="w-full rounded-2xl bg-primary py-4 font-semibold text-white shadow-[0_2px_12px_var(--accent-border)] transition-colors duration-150 ease-out hover:bg-primary-hover"
      >
        {step < slides.length - 1 ? "Continue" : "Begin searching"}
      </button>
      <button type="button" onClick={finish} className="mt-3 text-sm text-ink-muted transition-colors hover:text-ink">
        Skip
      </button>
    </motion.div>
  );
}
