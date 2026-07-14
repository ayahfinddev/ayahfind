# AyahFind Design System

This document is the single source of truth for AyahFind's visual language. Every new component — for Quran, Hadith, Tafsir, Qira'at, Symbols, or any future module — must follow these rules rather than inventing new ones. If an implementation reveals a gap, update this doc and the token layer (`src/app/globals.css`, `tailwind.config.ts`) together, not just one of them.

## Surface hierarchy

Exactly four elevation levels exist in the whole app. Every card, modal, sheet, popup, and panel picks one — nothing invents a fifth.

| Level | Token | Used for | Shadow / border |
|---|---|---|---|
| Background | `--background` | Page canvas | none |
| Surface | `--surface` | Default cards, verse-list wrapper, list rows | `shadow-xs` + `border` |
| Elevated Surface | `--surface-elevated` | In-flow content that pops above surface: expandable panels (Tafsir, Qira'at), dropdowns | `shadow-sm` + `border-strong` |
| Floating Surface | `--surface-floating` | Content above the whole page: dialogs, sheets, the audio mini-player, toasts, symbol popups | `shadow-md` (border-only on AMOLED, where shadows don't read on true black) |

A secondary surface tone (`--surface-secondary`) exists for subtle in-card fills (e.g. a nested row inside a card) — it is not a fifth elevation level, just a tint of `--surface`.

## Color tokens (semantic)

Defined in `src/app/globals.css`, consumed via Tailwind color keys in `tailwind.config.ts`:

- `--background`, `--surface`, `--surface-secondary`, `--surface-elevated`, `--surface-floating`
- `--text`, `--text-secondary`, `--text-tertiary`
- `--border`, `--border-strong`
- `--primary`, `--primary-hover`, `--accent-surface`, `--accent-border`
- `--success`, `--warning`, `--error`
- `--highlight` (tajweed/waqf marks — theme-aware, replaces hardcoded amber)

Existing names (`--canvas`, `--elevated`, `--card`, `--ink`, `--muted`, `--subtle`, `--accent`, `--accent-dim`) remain as aliases chained to the names above, so existing Tailwind classes (`bg-canvas`, `text-ink-muted`, etc.) keep working unchanged. New code should prefer the semantic names.

**Contrast targets** (checked against each theme's own `--background`/`--surface`): `--text` and `--text-secondary` meet WCAG AA (4.5:1) in every theme. `--text-tertiary` is deliberately de-emphasized (captions, timestamps, metadata) — it targets AA-large/UI-component contrast (3:1) at minimum in every theme, and in practice clears 5:1+ in the five dark-style themes (dark/midnight/forest/royal/amoled).

## Themes

8 built-in themes, switched via `next-themes`' `data-theme` attribute: **Light** (default), **Dark**, **Emerald**, **Midnight**, **Sand**, **Forest**, **Royal**, **AMOLED**. Each theme is one `[data-theme="x"]` CSS block that redefines only the semantic variables above — layout never changes between themes, only the palette. AMOLED sets `--surface: #000` and relies on `border` rather than `box-shadow` for elevation.

## Radius scale

Implemented on top of Tailwind's own radius scale (no new arbitrary values, no risky rename) — `lg` and `xl` already equal 8px/12px by Tailwind default, so only `2xl` needed a config tweak (16px → 20px):

| Tier | Tailwind utility | Value | Used for |
|---|---|---|---|
| `sm` | `rounded-lg` | 8px | Inputs, small badges |
| `md` | `rounded-xl` | 12px | Buttons, default cards |
| `lg` | `rounded-2xl` | 20px (overridden in `tailwind.config.ts`, was 16px) | Dialogs, sheets, hero/floating cards |

Existing usages collapse into this scale by context, not by mechanical find-replace: a `rounded-lg` icon button stays `sm`, a `rounded-xl` card stays `md`, a `rounded-2xl` dialog stays `lg` (and gets slightly rounder for free from the config tweak). `rounded-full` remains for pills/avatars/badges. Do not reach for Tailwind's own `rounded-sm`/`rounded-md` utilities (2px/6px) — they are not part of this scale.

## Spacing scale

Tailwind's default spacing scale, plus documented gap-fillers added only where the component audit found a real need: `4.5` (1.125rem), `13` (3.25rem), `18` (4.5rem) — used for verse-card vertical rhythm. No parallel spacing system is introduced.

**Vertical rhythm**: stacked reader sections (Surah header → Navigation → Bismillah → Verse 1 → Verse 2 → ...) use one consistent gap value between sections so the flow reads as continuous rhythm, not disconnected blocks.

## Typography hierarchy

| Tier | Token | Role |
|---|---|---|
| Large heading | `text-heading-lg` (2rem / 1.25) | Page titles |
| Section heading | `text-heading-sm` (1.25rem / 1.4) | Card/section titles |
| Body | `text-body` (1rem / 1.65) | Primary reading text |
| Secondary | `text-body-sm` (0.9375rem / 1.6) | Translations, supporting copy |
| Metadata | `text-sm`/`text-xs` + `--text-tertiary` | Reciter names, timestamps, verse refs |
| Caption | `text-caption` (0.75rem / 1.4) | Smallest labels |

**Arabic dominance rule**: on any card showing Arabic + translation + metadata, Arabic is always the largest and highest-contrast element (`text-arabic-md`/`text-arabic-lg`, `--text`), the translation is visually secondary (`text-body-sm`, `--text-secondary`), and metadata is the most subtle (`--text-tertiary`, smallest size). This rule applies uniformly to `VerseCard`, `AyahResultCard`, and any future Hadith/Tafsir card.

## Shadow levels

Three tiers only, already defined as `--shadow-xs`, `--shadow-sm`, `--shadow-md` — mapped 1:1 onto the surface hierarchy above. No component defines its own one-off `shadow-[...]` arbitrary value; all shadows come from these three tokens (or `border`-only on AMOLED).

## Animation durations

| Duration | Easing | Used for |
|---|---|---|
| 150ms | ease-out | Hover, click, icon-button state changes |
| 200ms | ease-out | Segment/toggle/tab transitions |
| 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Page transitions, reader transitions |

Theme switching is a clean, instant CSS-variable swap — no transition on `background-color`/`color`. Transitioning those two properties when their value comes from `var()` was tested and found to sometimes leave the previous theme's paint stuck (the browser doesn't reliably retrigger the transition across a `data-theme` attribute swap), so themes cut over immediately instead. All other animation is wrapped by a `prefers-reduced-motion: reduce` guard that disables `.page-enter`, `.symbol-popup`, `.reader-highlight`, and all transitions.

## Hover & focus behaviour

- One shared `:focus-visible` ring recipe, colored with `--primary`, used everywhere (nav, buttons, inputs, reader actions, dialogs) — no component defines its own focus style.
- Default hover state is a subtle background/border tint (e.g. `hover:bg-surface-secondary`), not a shadow pop or scale transform.
- Explicit "lift" cards (e.g. search results) are the one deliberate exception, using a small `-translate-y-0.5` + shadow increase on hover to signal interactivity — reserved for that one case, not applied everywhere.

## Icon sizing

| Size | Used for |
|---|---|
| 16px | Inline/metadata icons |
| 20px | Default UI icon (nav, actions) |
| 24px | Feature/empty-state icons |

Icon *buttons* target a 44×44px touch target (`IconButton`'s `md`/`lg` sizes, WCAG AAA) regardless of the icon's visual size inside them. The one deliberate exception is `IconButton`'s `sm` size (36px) used in dense rows — verse/result action bars, the reader top-bar toolbar — where fitting every control at 44px isn't possible; 36px still clears the WCAG AA minimum (24px) with margin.

## Card padding

| Size | Value | Used for |
|---|---|---|
| `sm` | 12px | Compact rows, chips |
| `md` | 16–20px | Default cards |
| `lg` | 24–32px | Hero cards, reader sections |

Exposed as the `padding` prop on `ContentCard`/`ReaderSection`.

## Button hierarchy

| Variant | Role |
|---|---|
| `primary` | The one filled CTA per view (e.g. "Resume", "Search") |
| `secondary` | Bordered, secondary actions |
| `ghost` | Text-only, list/row actions |
| `destructive` | Errors, removal, irreversible actions |

No ad hoc CTA styling is introduced outside these four variants (`Button` primitive, `src/components/ui/Button.tsx`).

## Generic primitives

These live in `src/components/ui/` and are named for what they do, not where they're used, so any future module (Hadith, Asbab al-Nuzul, Qira'at comparisons, Symbols) inherits the same visual language automatically: `Button`, `IconButton`, `ContentCard`, `ReaderSection`, `ExpandablePanel`, `ActionBar`, `Badge`, `Tabs`, `Segment`, `SearchInput`, `Sheet`.

## Focus Mode readiness

Focus Mode (collapsing chrome to maximize reading space) is not implemented yet, but the reader is structured so it can be added without a refactor: the top bar, navigator toggle, and prev/next row are discrete regions wrapping the `ReaderSection` stack rather than interleaved into it. A future focus toggle only needs to hide those regions.
