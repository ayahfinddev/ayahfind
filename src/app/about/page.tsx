"use client";

import {
  IconMessageCircle,
  IconClock,
  IconUser,
  IconBooks,
  IconFeather,
  IconArrowsRightLeft,
  IconTag,
  IconLink,
} from "@tabler/icons-react";

const journeyItems = [
  { q: "What does this verse mean?", Icon: IconMessageCircle },
  { q: "Why was it revealed?", Icon: IconClock },
  { q: "What did the scholars say?", Icon: IconUser },
  { q: "What tafsir is available?", Icon: IconBooks },
  { q: "What hadith relate to it?", Icon: IconFeather },
  { q: "How is it recited in different qira'at?", Icon: IconArrowsRightLeft },
  { q: "What do these Quranic symbols mean?", Icon: IconTag },
  { q: "What other verses discuss this topic?", Icon: IconLink },
];

const gapTiles = [
  { label: "To find an ayah", val: "One website" },
  { label: "To read tafsir", val: "Another website" },
  { label: "Why it was revealed", val: "Somewhere else" },
  { label: "To compare qira'at", val: "Multiple sources" },
  { label: "Related hadith", val: "Multiple collections" },
];

const principles = [
  {
    title: "Authenticity above everything",
    desc: "Users should not have to worry whether the information is genuine. Every result traces back to an authentic Islamic source.",
  },
  {
    title: "Sources always visible",
    desc: "References are always clear. Knowledge is always traceable. Nothing is presented without attribution.",
  },
  {
    title: "Retrieval, not generation",
    desc: "AyahFind never generates Islamic content. AI is used only to improve retrieval. The scholarship belongs to the scholars.",
  },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <div className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-text-tertiary">
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-heading-sm leading-snug text-text">{children}</h2>;
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-body-sm text-text sm:px-10">
      {/* Hero */}
      <Eyebrow>AyahFind</Eyebrow>
      <h1 className="mb-3 text-heading-lg leading-tight text-text">
        Islamic knowledge should be <em className="italic text-primary-hover">easy to find.</em>
      </h1>
      <p className="mb-8 max-w-md text-body leading-relaxed text-text-secondary">
        The knowledge exists. The problem is that it is scattered. AyahFind brings authentic
        Islamic sources together — so Muslims can retrieve, understand, and explore from one
        trusted place.
      </p>

      <hr className="my-8 border-border" />

      {/* The Problem */}
      <Eyebrow>The problem</Eyebrow>
      <SectionHeading>
        Islamic knowledge exists.
        <br />
        <em className="italic text-primary-hover">But it is hard to reach.</em>
      </SectionHeading>
      <p className="max-w-md text-body leading-relaxed text-text-secondary">
        A Muslim who wants to learn often has to search across many different websites. The
        knowledge exists — but it is spread across the internet, with no guarantee the sources
        are authentic.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {gapTiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-0.5 text-sm font-medium text-text">{tile.label}</div>
            <div className="text-sm text-text-tertiary">→ {tile.val}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-r-lg border-l-2 border-primary bg-accent-surface px-4 py-3.5">
        <p className="text-body italic leading-relaxed text-primary-hover">
          AyahFind exists to bring authentic Islamic knowledge together and make it accessible
          through retrieval.
        </p>
      </div>

      <hr className="my-8 border-border" />

      {/* Where it started */}
      <Eyebrow>Where it started</Eyebrow>
      <SectionHeading>
        Built for <em className="italic text-primary-hover">imperfect memory.</em>
      </SectionHeading>
      <p className="max-w-md text-body leading-relaxed text-text-secondary">
        The original problem AyahFind solved was helping users find forgotten ayahs from
        imperfect memory. You remember a feeling, a fragment, a sound — not the exact words.
        That remains important. But it is only the beginning.
      </p>
      <p
        className="mt-4 text-right font-arabic text-2xl leading-loose text-primary-hover"
        dir="rtl"
        lang="ar"
      >
        لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا
      </p>
      <p className="text-right text-xs text-text-tertiary">
        Found by searching: &quot;Allah does not burden&quot; · Al-Baqarah 2:286
      </p>

      <hr className="my-8 border-border" />

      {/* The Journey */}
      <Eyebrow>The journey</Eyebrow>
      <SectionHeading>
        Finding the ayah is <em className="italic text-primary-hover">the starting point.</em>
      </SectionHeading>
      <p className="max-w-md text-body leading-relaxed text-text-secondary">
        After finding a verse, a user should be able to keep learning — without leaving the
        platform.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {journeyItems.map(({ q, Icon }) => (
          <div
            key={q}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text"
          >
            <Icon size={20} className="shrink-0 text-primary-hover" />
            {q}
          </div>
        ))}
      </div>

      <p className="mt-4 text-body leading-relaxed text-text-secondary">
        All of these answers — from one place.
      </p>

      <hr className="my-8 border-border" />

      {/* Principles */}
      <Eyebrow>Our principles</Eyebrow>
      <SectionHeading>
        Authentic. <em className="italic text-primary-hover">Always traceable.</em>
      </SectionHeading>

      <div>
        {principles.map((p, i) => (
          <div
            key={p.title}
            className={`flex items-start gap-3.5 py-3.5 ${i < principles.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-surface text-primary-hover">
              ✓
            </div>
            <div>
              <div className="mb-0.5 font-medium text-text">{p.title}</div>
              <div className="text-sm leading-relaxed text-text-secondary">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <hr className="my-8 border-border" />

      {/* Mission */}
      <Eyebrow>The mission</Eyebrow>
      <SectionHeading>
        Learning about Islam <em className="italic text-primary-hover">should be easier.</em>
      </SectionHeading>

      <div className="mb-12 rounded-xl bg-primary px-6 py-5">
        <p className="text-body italic leading-relaxed text-white/90">
          The mission is to help Muslims retrieve, connect, and explore the knowledge of their
          religion from one trusted place.
        </p>
        <span className="mt-2.5 block text-sm text-white/70">
          Finding Islamic knowledge should be easier. Accessing authentic sources should be
          easier.
        </span>
      </div>
    </div>
  );
}
