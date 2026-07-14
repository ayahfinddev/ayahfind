'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

type Category = 'all' | 'waqf' | 'sajdah' | 'structure' | 'tajweed';
/** Severity/role grouping for the detail badge — not a 1:1 mapping of the
 * classical terminology's every nuance, but a coherent, theme-aware scale:
 * strict rule, optional/lenient, preferred-but-flexible, pure structure,
 * or a tajweed pronunciation note (reuses the --highlight token). */
type BadgeTone = 'strict' | 'lenient' | 'preferred' | 'structural' | 'tajweed';

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  strict: 'border-error/30 bg-error/10 text-error',
  lenient: 'border-success/30 bg-success/10 text-success',
  preferred: 'border-warning/30 bg-warning/10 text-warning',
  structural: 'border-border-strong bg-surface-secondary text-text-secondary',
  tajweed: 'border-highlight-border bg-highlight-surface text-highlight',
};

interface FoundInEntry {
  label: string;
  href?: string;
}

interface SymbolEntry {
  id: string;
  glyph: string;
  glyphDisplay?: string; // alternate display for the grid button
  gridLabel: string;
  nameEn: string;
  nameAr: string;
  category: Category;
  badgeText: string;
  badgeTone: BadgeTone;
  meaning: string;
  guidance: string;
  foundIn: FoundInEntry[];
  sources: string[];
  comingSoon?: boolean;
}

const SYMBOLS: SymbolEntry[] = [
  {
    id: 'waqf_lazim',
    glyph: 'م',
    gridLabel: 'Waqf',
    nameEn: 'Waqf Lazim (Compulsory Stop)',
    nameAr: 'وقف لازم',
    category: 'waqf',
    badgeText: 'Stopping required',
    badgeTone: 'strict',
    meaning:
      'A stopping point where the reader must pause before continuing. Continuing without stopping would distort or reverse the intended meaning of the verse. This is the strongest stopping mark in the Quran.',
    guidance:
      'The reader should always stop here — even mid-breath if needed. Failure to stop can cause a serious change in meaning that would be theologically problematic.',
    foundIn: [
      { label: 'Al-Baqarah 2:2', href: '/ayah/2/2' },
      { label: 'Al-Baqarah 2:7', href: '/ayah/2/7' },
      { label: 'Al-Kahf 18:1–2' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah (classical tajweed text)',
      'King Fahd Complex Mushaf conventions',
      'Abu Amr al-Dani, Al-Taysir',
    ],
  },
  {
    id: 'la_waqf',
    glyph: 'لا',
    gridLabel: 'La',
    nameEn: 'La Waqf (Do Not Stop)',
    nameAr: 'لا وقف',
    category: 'waqf',
    badgeText: 'Do not stop',
    badgeTone: 'strict',
    meaning:
      'Stopping here is discouraged or impermissible because it would sever a grammatical or semantic connection that the reader must carry across. The meaning flows continuously through this point.',
    guidance:
      'Continue reading without pausing. If you need to breathe, go back a few words and restart from before this point so the meaning is preserved intact.',
    foundIn: [
      { label: 'Al-Baqarah 2:1–2' },
      { label: 'Al-Fatiha 1:4', href: '/ayah/1/4' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'Abu Amr al-Dani, Al-Taysir',
      'King Fahd Complex Mushaf',
    ],
  },
  {
    id: 'waqf_jaiz',
    glyph: 'ج',
    gridLabel: 'Waqf',
    nameEn: 'Waqf Jaiz (Permissible Stop)',
    nameAr: 'وقف جائز',
    category: 'waqf',
    badgeText: 'Stopping optional',
    badgeTone: 'lenient',
    meaning:
      'Stopping is equally permissible and continuation is equally acceptable. Neither choice affects the intended meaning — the verse reads coherently in either case.',
    guidance:
      'You may stop here to catch your breath or for emphasis. You may also continue without stopping. Both readings are correct and carry the same meaning.',
    foundIn: [
      { label: 'Al-Baqarah 2:6', href: '/ayah/2/6' },
      { label: 'Al-Imran 3:7', href: '/ayah/3/7' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'Abu Amr al-Dani, Al-Taysir',
      'King Fahd Complex Mushaf',
    ],
  },
  {
    id: 'waqf_awla',
    glyph: 'قلى',
    gridLabel: 'Waqf',
    nameEn: 'Waqf Awla (Stopping Preferred)',
    nameAr: 'الوقف أولى',
    category: 'waqf',
    badgeText: 'Stopping preferred',
    badgeTone: 'preferred',
    meaning:
      'Stopping is the preferred and recommended option at this point. Continuing is not forbidden, but the reader who stops demonstrates better understanding of the verse\'s structure. The abbreviation stands for قيل الوقف عليه أولى.',
    guidance:
      'Readers are encouraged to stop here. The meaning is naturally complete at this point. Continuing may slightly weaken the rhetorical effect of the verse.',
    foundIn: [
      { label: 'Al-Baqarah 2:29', href: '/ayah/2/29' },
      { label: 'Al-Imran 3:18', href: '/ayah/3/18' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'King Fahd Complex Mushaf',
      'Al-Suyuti, Al-Itqan fi Ulum al-Quran',
    ],
  },
  {
    id: 'wasl_awla',
    glyph: 'صلى',
    gridLabel: 'Wasl',
    nameEn: 'Wasl Awla (Continuation Preferred)',
    nameAr: 'الوصل أولى',
    category: 'waqf',
    badgeText: 'Continuation preferred',
    badgeTone: 'preferred',
    meaning:
      'The reader is advised to continue here rather than stop. Continuing is considered better for preserving the full sense and flow of the verse. The abbreviation stands for قيل الوصل أولى.',
    guidance:
      'Prefer to continue reading through this mark if your breath allows. The verse carries fuller meaning when read without a break at this point.',
    foundIn: [
      { label: 'Al-Baqarah 2:5', href: '/ayah/2/5' },
      { label: 'Al-Nisa 4:14', href: '/ayah/4/14' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'Abu Amr al-Dani, Al-Taysir',
      'King Fahd Complex Mushaf',
    ],
  },
  {
    id: 'waqf_mutlaq',
    glyph: 'ط',
    gridLabel: 'Waqf',
    nameEn: 'Waqf Mutlaq (Absolute Stop)',
    nameAr: 'وقف مطلق',
    category: 'waqf',
    badgeText: 'Full stop',
    badgeTone: 'strict',
    meaning:
      'An absolute stopping point indicating a complete and definitive pause. The topic or statement is fully concluded here. The reader should stop and not continue in the same breath.',
    guidance:
      'Always stop here. The meaning is complete and a new concept or command follows. Stopping here marks proper comprehension of the verse\'s structure.',
    foundIn: [
      { label: 'Al-Baqarah 2:33', href: '/ayah/2/33' },
      { label: 'Al-Imran 3:30', href: '/ayah/3/30' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'King Fahd Complex Mushaf',
      'Abu Amr al-Dani, Al-Taysir',
    ],
  },
  {
    id: 'waqf_mujawwaz',
    glyph: 'ز',
    gridLabel: 'Waqf',
    nameEn: 'Waqf Mujawwaz (Permitted but Discouraged)',
    nameAr: 'وقف مجوَّز',
    category: 'waqf',
    badgeText: 'Permitted, continue better',
    badgeTone: 'preferred',
    meaning:
      'Stopping is technically permitted here but continuing without stopping is the better choice. The mark indicates that stopping, while not ideal, will not misrepresent the verse.',
    guidance:
      'Try to continue if possible. Stop only if you genuinely need to breathe. If you do stop, go back to an earlier natural point when you resume.',
    foundIn: [
      { label: 'Al-Baqarah 2:10', href: '/ayah/2/10' },
      { label: 'Al-Baqarah 2:16', href: '/ayah/2/16' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'King Fahd Complex Mushaf',
    ],
  },
  {
    id: 'waqf_murakhkhas',
    glyph: 'ص',
    gridLabel: 'Waqf',
    nameEn: 'Waqf Murakhkhas (Concessionary Stop)',
    nameAr: 'وقف مرخَّص',
    category: 'waqf',
    badgeText: 'Stop only if necessary',
    badgeTone: 'preferred',
    meaning:
      'Stopping here is only a concession for practical necessity — such as extreme breathlessness. In normal circumstances the reader should continue. The mark indicates that stopping is grammatically difficult but physically understandable.',
    guidance:
      'Only stop here if you genuinely cannot continue. If you must stop, return slightly before this point and re-read to restore the complete sense of the passage.',
    foundIn: [
      { label: 'Al-Baqarah 2:8–9' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'Abu Amr al-Dani, Al-Taysir',
      'King Fahd Complex Mushaf',
    ],
  },
  {
    id: 'waqfah',
    glyph: 'وقفة',
    gridLabel: 'Waqfah',
    nameEn: 'Waqfah (Brief Pause)',
    nameAr: 'وقفة',
    category: 'waqf',
    badgeText: 'Brief pause, do not restart breath',
    badgeTone: 'preferred',
    meaning:
      'A very short pause that is shorter than a full stopping point but longer than a normal reading breath. The reader pauses briefly without fully stopping the breath or the flow of recitation.',
    guidance:
      'Pause slightly here — as if allowing the word to settle — but do not restart your breath. Continue in the same breath-cycle from where you are.',
    foundIn: [
      { label: 'Al-Kahf 18:1–2' },
      { label: 'Yasin 36:52', href: '/ayah/36/52' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'Al-Suyuti, Al-Itqan fi Ulum al-Quran',
    ],
  },
  {
    id: 'sajdah',
    glyph: '۩',
    gridLabel: 'Sajdah',
    nameEn: 'Sajdah Marker (Prostration Mark)',
    nameAr: 'علامة السجدة',
    category: 'sajdah',
    badgeText: 'Prostration recommended',
    badgeTone: 'tajweed',
    meaning:
      'This marks one of the 15 verses of prostration in the Quran. When a reader reaches this verse — in recitation or reading — it is recommended (in some opinions obligatory during prayer) to perform a prostration of recitation (sajdah al-tilawah).',
    guidance:
      'When you reach this verse, bow down in prostration. Recite Subhana Rabbiyal A\'la. Rise and continue reading. Outside of prayer, this prostration is considered sunnah by the majority of scholars.',
    foundIn: [
      { label: 'Al-Araf 7:206', href: '/ayah/7/206' },
      { label: 'Al-Isra 17:107', href: '/ayah/17/107' },
      { label: 'Al-Hajj 22:18', href: '/ayah/22/18' },
      { label: 'Al-Sajdah 32:15', href: '/ayah/32/15' },
      { label: 'Al-Najm 53:62', href: '/ayah/53/62' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'Ibn Qudamah, Al-Mughni',
      'Al-Nawawi, Al-Majmu',
    ],
  },
  {
    id: 'verse_end',
    glyph: '۝',
    gridLabel: 'Verse',
    nameEn: 'Verse End Marker',
    nameAr: 'فاصلة الآية',
    category: 'structure',
    badgeText: 'Verse boundary',
    badgeTone: 'structural',
    meaning:
      'This ornamental circle marks the end of a Quranic verse (ayah). It typically contains the verse number in certain mushaf editions. It visually separates verses and helps readers track their position in the text.',
    guidance:
      'This is a structural marker only — not a stopping instruction. You may stop here, continue, or pause briefly.',
    foundIn: [
      { label: 'Appears at the end of every verse throughout the Quran' },
    ],
    sources: [
      'King Fahd Complex Mushaf conventions',
      'Al-Suyuti, Al-Itqan fi Ulum al-Quran',
    ],
  },
  {
    id: 'ruku',
    glyph: 'ع',
    gridLabel: 'Ruku',
    nameEn: 'Ruku Marker',
    nameAr: 'علامة الركوع',
    category: 'structure',
    badgeText: 'Thematic section boundary',
    badgeTone: 'structural',
    meaning:
      'Marks the beginning or end of a ruku — a thematic grouping of verses used primarily in the Hanafi tradition to denote units of approximately equal length for structuring daily recitation. A ruku typically contains between 5 and 10 verses.',
    guidance:
      'This is an informational marker for recitation organisation only. No stopping instruction is implied.',
    foundIn: [
      { label: 'Throughout all major surahs — Al-Baqarah contains 40 ruku sections' },
    ],
    sources: [
      'Hanafi fiqh tradition',
      'Al-Suyuti, Al-Itqan fi Ulum al-Quran',
      'King Fahd Complex Mushaf',
    ],
  },
  {
    id: 'hizb',
    glyph: '۞',
    gridLabel: 'Hizb',
    nameEn: 'Hizb Marker',
    nameAr: 'علامة الحزب',
    category: 'structure',
    badgeText: 'Structural division',
    badgeTone: 'structural',
    meaning:
      'Marks the beginning of a hizb — one of the 60 equal portions of the Quran used for dividing the text for systematic daily recitation over one or two months. Each juz contains two ahzab.',
    guidance:
      'A structural reference point only. No recitation instruction is implied.',
    foundIn: [
      { label: 'Each juz contains exactly two hizb sections — 60 total across the Quran' },
    ],
    sources: [
      'King Fahd Complex Mushaf conventions',
      'Al-Suyuti, Al-Itqan fi Ulum al-Quran',
    ],
  },
  {
    id: 'shaddah',
    glyph: 'بّ',
    glyphDisplay: 'ّ',
    gridLabel: 'Shaddah',
    nameEn: 'Shaddah',
    nameAr: 'شدَّة',
    category: 'tajweed',
    badgeText: 'Double this consonant',
    badgeTone: 'tajweed',
    meaning:
      'The shaddah indicates that a consonant is doubled — it is both a letter with a sukun and the same letter with a vowel. The letter must be pronounced twice in one sound, held slightly longer than a single consonant.',
    guidance:
      'Lean into this consonant, holding it briefly before releasing. It should feel like the letter is doubled. Correct shaddah is one of the most frequently missed points of tajweed for learners.',
    foundIn: [
      { label: 'إِيَّاكَ (iyyāka) — Al-Fatiha 1:5', href: '/ayah/1/5' },
      { label: 'رَبِّ (rabbi) — throughout the Quran' },
    ],
    sources: [
      'Ibn al-Jazari, Al-Jazariyyah',
      'Al-Jazari, Al-Nashr fil-Qira\'at al-Ashr',
      'Al-Suyuti, Al-Itqan fi Ulum al-Quran',
    ],
  },
  {
    id: 'imalah',
    glyph: 'ر۪',
    gridLabel: 'Imalah',
    nameEn: 'Imalah Kubra',
    nameAr: 'إمالة كبرى',
    category: 'tajweed',
    badgeText: 'Special pronunciation',
    badgeTone: 'tajweed',
    meaning:
      'This is the only word in the entire Quran where Imalah Kubra applies in the Hafs an Asim recitation. Imalah means "tilting" — the vowel sound is blended exactly halfway between a Fathah (ah) and a Kasrah (ee). The word مَجْرَاهَا in Surah Hud 11:41 is recited as "Maj-ray-ha" — matching the long "ay" sound in the English words "say", "day", or "may". Do not say a flat "Maj-ra-ha" and do not say a full "Maj-ree-ha" — the sound sits precisely 50% between the two.',
    guidance:
      'Keep the letter Ra thin and light (Tarqeeq) — not heavy. Pull back the back of your tongue slightly, drop your jaw, keep your lips relaxed and flat, and tilt the vowel precisely halfway toward a Kasrah.',
    foundIn: [
      { label: 'Hud 11:41 only — the only occurrence in the entire Quran in the Hafs an Asim narration', href: '/ayah/11/41' },
    ],
    sources: [
      'Imam Ibn al-Jazari, Al-Nashr fil-Qira\'at al-Ashr',
      'Dr. Ayman Swayd (contemporary Sunni qira\'at authority)',
      'Classical qira\'at scholarship on the seven mutawatir recitations',
    ],
  },
];

const TABS: { id: Category; label: string }[] = [
  { id: 'all', label: 'All marks' },
  { id: 'waqf', label: 'Waqf (stopping)' },
  { id: 'sajdah', label: 'Sajdah' },
  { id: 'structure', label: 'Structure' },
  { id: 'tajweed', label: 'Tajweed' },
];

export default function SymbolsPage() {
  const [activeTab, setActiveTab] = useState<Category>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = activeTab === 'all' ? SYMBOLS : SYMBOLS.filter((s) => s.category === activeTab);
  const selected = SYMBOLS.find((s) => s.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 md:pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-heading-lg text-text">
          Quranic symbols &amp; reading marks
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Tap any symbol to learn its name, meaning, and recitation guidance
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedId(null);
            }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
              activeTab === tab.id
                ? 'border-accent-border bg-accent-surface text-primary-hover'
                : 'border-border bg-surface text-text-secondary hover:border-accent-border hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Symbol grid */}
      <div className="mb-4 grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {filtered.map((sym) => (
          <button
            key={sym.id}
            onClick={() => handleSelect(sym.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 pt-3 text-center transition-colors duration-150 ease-out ${
              selectedId === sym.id
                ? 'border-accent-border bg-accent-surface shadow-sm'
                : 'border-border bg-surface hover:border-accent-border hover:bg-surface-secondary'
            }`}
          >
            <span
              className="font-arabic text-xl leading-none text-text"
              dir="rtl"
              lang="ar"
            >
              {sym.glyph}
            </span>
            <span className="mt-0.5 text-[10px] leading-tight text-text-secondary">{sym.gridLabel}</span>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected ? (
        <DetailPanel symbol={selected} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface-secondary px-6 py-10 text-center">
          <p className="text-sm text-text-tertiary">Select a symbol above to explore its meaning</p>
        </div>
      )}
    </div>
  );
}

function DetailPanel({ symbol }: { symbol: SymbolEntry }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      {/* Top section */}
      <div className="flex items-start gap-4 border-b border-border p-5">
        {/* Glyph square */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent-surface">
          <span className="font-arabic text-3xl leading-none text-text" dir="rtl" lang="ar">
            {symbol.glyph}
          </span>
        </div>

        {/* Names + badge */}
        <div className="flex-1 pt-0.5">
          <h2 className="text-base font-semibold text-text">{symbol.nameEn}</h2>
          <p className="font-arabic mt-0.5 text-sm text-primary-hover" dir="rtl" lang="ar">
            {symbol.nameAr}
          </p>
          <Badge size="md" className={`mt-2 ${BADGE_TONE_CLASSES[symbol.badgeTone]}`}>
            {symbol.badgeText}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 p-5 text-sm">
        {/* Meaning */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Meaning
          </p>
          <p className="leading-relaxed text-text-secondary">{symbol.meaning}</p>
        </div>

        {/* Reading Guidance */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Reading Guidance
          </p>
          <div className="border-l-2 border-accent-border pl-3">
            <p className="leading-relaxed text-text-secondary">{symbol.guidance}</p>
          </div>
        </div>

        {/* Found in */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Found In
          </p>
          <div className="flex flex-wrap gap-1.5">
            {symbol.foundIn.map((entry) =>
              entry.href ? (
                <Link
                  key={entry.label}
                  href={entry.href}
                  className="rounded-lg border border-border bg-surface-secondary px-2.5 py-1 text-xs text-primary-hover transition-colors duration-150 ease-out hover:bg-accent-surface"
                >
                  {entry.label}
                </Link>
              ) : (
                <span
                  key={entry.label}
                  className="rounded-lg border border-border bg-surface-secondary px-2.5 py-1 text-xs text-text-secondary"
                >
                  {entry.label}
                </span>
              )
            )}
          </div>
        </div>

        {/* Sources */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Sources
          </p>
          <ul className="space-y-0.5">
            {symbol.sources.map((src) => (
              <li key={src} className="text-xs italic text-text-tertiary">
                {src}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
