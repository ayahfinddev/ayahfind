/**
 * Central riwayah (Quran reading transmission) registry — single source of
 * truth for names/colours/enabled-state, mirrored from
 * backend/app/core/riwayat.py. Nothing else in the app should hardcode a
 * riwayah name, id, or colour — always go through this module.
 *
 * Terminology (kept distinct on purpose):
 *  - Qira'ah:  the reading associated with an Imam.
 *  - Riwayah:  a transmission associated with a narrator (e.g. Hafs 'an
 *              'Asim) — the unit selected/displayed/persisted everywhere.
 *  - Reading group / equivalence: riwayat that share the exact displayed
 *              form at a particular ayah (see computeReadingChipsState).
 *
 * Only `hafs-an-asim` is enabled today — every other entry is a
 * placeholder for a riwayah this architecture is ready to support once a
 * complete, verified text dataset is integrated on the backend. Enabling
 * one here without the backend registry also enabling it does nothing —
 * `isEnabled` must stay in sync with app/core/riwayat.py.
 */

export type RiwayahId = string;
export type QiraahId = string;
export type ReadingVariantId = string;

export interface RiwayahDefinition {
  id: RiwayahId;
  displayName: string;
  shortName: string;
  qiraahName: string;
  imamName: string;
  narratorName: string;
  textDatasetId: string | null;
  audioDatasetId: string | null;
  symbolSetId: string;
  colorToken: string;
  isDefault: boolean;
  isEnabled: boolean;
}

export const DEFAULT_RIWAYAH_ID: RiwayahId = "hafs-an-asim";

const REGISTRY_LIST: RiwayahDefinition[] = [
  {
    id: "hafs-an-asim",
    displayName: "Ḥafṣ ʿan ʿĀṣim",
    shortName: "Hafs",
    qiraahName: "Qira'at 'Asim",
    imamName: "'Asim ibn Abi al-Najud",
    narratorName: "Hafs ibn Sulayman al-Asadi",
    textDatasetId: "hafs-an-asim-madinah-v1",
    audioDatasetId: "everyayah-hafs",
    symbolSetId: "hafs-madinah-mushaf",
    colorToken: "hafs",
    isDefault: true,
    isEnabled: true,
  },
  {
    id: "shubah-an-asim",
    displayName: "Shu'bah 'an 'Asim",
    shortName: "Shu'bah",
    qiraahName: "Qira'at 'Asim",
    imamName: "'Asim ibn Abi al-Najud",
    narratorName: "Shu'bah ibn 'Ayyash",
    textDatasetId: null,
    audioDatasetId: null,
    symbolSetId: "pending-dataset",
    colorToken: "shubah",
    isDefault: false,
    isEnabled: false,
  },
  {
    id: "warsh-an-nafi",
    displayName: "Warsh 'an Nafi'",
    shortName: "Warsh",
    qiraahName: "Qira'at Nafi'",
    imamName: "Nafi' al-Madani",
    narratorName: "Warsh ('Uthman ibn Sa'id al-Misri)",
    textDatasetId: null,
    audioDatasetId: null,
    symbolSetId: "pending-dataset",
    colorToken: "warsh",
    isDefault: false,
    isEnabled: false,
  },
  {
    id: "qalun-an-nafi",
    displayName: "Qalun 'an Nafi'",
    shortName: "Qalun",
    qiraahName: "Qira'at Nafi'",
    imamName: "Nafi' al-Madani",
    narratorName: "Qalun ('Isa ibn Mina)",
    textDatasetId: null,
    audioDatasetId: null,
    symbolSetId: "pending-dataset",
    colorToken: "qalun",
    isDefault: false,
    isEnabled: false,
  },
  {
    id: "al-duri-an-abi-amr",
    displayName: "Al-Duri 'an Abi 'Amr",
    shortName: "Al-Duri",
    qiraahName: "Qira'at Abi 'Amr",
    imamName: "Abu 'Amr ibn al-'Ala' al-Basri",
    narratorName: "Al-Duri (Hafs ibn 'Umar al-Duri)",
    textDatasetId: null,
    audioDatasetId: null,
    symbolSetId: "pending-dataset",
    colorToken: "al-duri",
    isDefault: false,
    isEnabled: false,
  },
  {
    id: "al-susi-an-abi-amr",
    displayName: "Al-Susi 'an Abi 'Amr",
    shortName: "Al-Susi",
    qiraahName: "Qira'at Abi 'Amr",
    imamName: "Abu 'Amr ibn al-'Ala' al-Basri",
    narratorName: "Al-Susi (Salih ibn Ziyad)",
    textDatasetId: null,
    audioDatasetId: null,
    symbolSetId: "pending-dataset",
    colorToken: "al-susi",
    isDefault: false,
    isEnabled: false,
  },
];

export const RIWAYAH_REGISTRY: Record<RiwayahId, RiwayahDefinition> = Object.fromEntries(
  REGISTRY_LIST.map((r) => [r.id, r])
);

export function getRiwayah(id: RiwayahId | null | undefined): RiwayahDefinition | undefined {
  if (!id) return undefined;
  return RIWAYAH_REGISTRY[id];
}

export function listRiwayat(options?: { enabledOnly?: boolean }): RiwayahDefinition[] {
  const values = REGISTRY_LIST.slice();
  const filtered = options?.enabledOnly ? values.filter((r) => r.isEnabled) : values;
  return filtered.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function isRiwayahEnabled(id: RiwayahId | null | undefined): boolean {
  const r = getRiwayah(id);
  return Boolean(r?.isEnabled);
}

/** Falls back to the default riwayah for missing/unknown/disabled ids —
 * used when persisted or server-supplied ids need a guaranteed-safe value
 * (Continue Reading migration, invalid localStorage, etc). */
export function resolveRiwayahId(id: RiwayahId | null | undefined): RiwayahId {
  if (id && isRiwayahEnabled(id)) return id;
  return DEFAULT_RIWAYAH_ID;
}

export function enabledRiwayahCount(): number {
  return REGISTRY_LIST.filter((r) => r.isEnabled).length;
}

// ─── Colour registry ────────────────────────────────────────────────────
//
// One central map, consumed by RiwayahBadge everywhere (search cards,
// Qira'at panel, reader, Continue Reading, comparison view, symbols). Never
// define a riwayah colour independently in a component. "Common to all" is
// a distinct neutral token — it must never borrow Hafs' colour, since it
// represents a shared-state concept, not any single riwayah.

export interface RiwayahThemeColors {
  background: string;
  foreground: string;
  border: string;
  darkBackground: string;
  darkForeground: string;
  darkBorder: string;
}

export const RIWAYAH_THEME: Record<string, RiwayahThemeColors> = {
  hafs: {
    background: "rgba(13, 148, 136, 0.10)",
    foreground: "#0d9488",
    border: "rgba(13, 148, 136, 0.28)",
    darkBackground: "rgba(45, 212, 191, 0.16)",
    darkForeground: "#5eead4",
    darkBorder: "rgba(45, 212, 191, 0.32)",
  },
  shubah: {
    background: "rgba(124, 58, 237, 0.10)",
    foreground: "#6d28d9",
    border: "rgba(124, 58, 237, 0.28)",
    darkBackground: "rgba(167, 139, 250, 0.16)",
    darkForeground: "#c4b5fd",
    darkBorder: "rgba(167, 139, 250, 0.32)",
  },
  warsh: {
    background: "rgba(217, 119, 6, 0.10)",
    foreground: "#b45309",
    border: "rgba(217, 119, 6, 0.28)",
    darkBackground: "rgba(251, 191, 36, 0.16)",
    darkForeground: "#fcd34d",
    darkBorder: "rgba(251, 191, 36, 0.32)",
  },
  qalun: {
    background: "rgba(37, 99, 235, 0.10)",
    foreground: "#1d4ed8",
    border: "rgba(37, 99, 235, 0.28)",
    darkBackground: "rgba(96, 165, 250, 0.16)",
    darkForeground: "#93c5fd",
    darkBorder: "rgba(96, 165, 250, 0.32)",
  },
  "al-duri": {
    background: "rgba(225, 29, 72, 0.10)",
    foreground: "#be123c",
    border: "rgba(225, 29, 72, 0.28)",
    darkBackground: "rgba(251, 113, 133, 0.16)",
    darkForeground: "#fda4af",
    darkBorder: "rgba(251, 113, 133, 0.32)",
  },
  "al-susi": {
    background: "rgba(5, 150, 105, 0.10)",
    foreground: "#047857",
    border: "rgba(5, 150, 105, 0.28)",
    darkBackground: "rgba(52, 211, 153, 0.16)",
    darkForeground: "#6ee7b7",
    darkBorder: "rgba(52, 211, 153, 0.32)",
  },
};

/** Neutral token for the "Common to all" shared state — deliberately not
 * Hafs' colour or any riwayah's colour, since it describes a relationship
 * between riwayat, not one riwayah. */
export const COMMON_TO_ALL_THEME: RiwayahThemeColors = {
  background: "rgba(120, 113, 108, 0.10)",
  foreground: "#57534e",
  border: "rgba(120, 113, 108, 0.28)",
  darkBackground: "rgba(168, 162, 158, 0.18)",
  darkForeground: "#d6d3d1",
  darkBorder: "rgba(168, 162, 158, 0.34)",
};

export function getRiwayahTheme(colorToken: string): RiwayahThemeColors {
  return RIWAYAH_THEME[colorToken] ?? COMMON_TO_ALL_THEME;
}

// ─── Reading-state model ────────────────────────────────────────────────
//
// Three concepts kept deliberately separate (never collapsed into one
// field): what the user explicitly picked, what is currently on screen,
// and which riwayat happen to share that exact wording.

export type ReadingSelectionSource = "user" | "saved-preference" | "search-result" | "default";

export interface QuranReadingState {
  explicitlySelectedRiwayahId: RiwayahId | null;
  displayedRiwayahId: RiwayahId;
  equivalentRiwayahIds: RiwayahId[];
  selectionSource: ReadingSelectionSource;
}

// ─── Reading chips (search-card, descriptive only) ─────────────────────

export type ReadingChipsState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "common-to-all" }
  | { kind: "riwayat"; shown: RiwayahDefinition[]; all: RiwayahDefinition[]; overflowCount: number };

const MAX_VISIBLE_CHIPS = 2;

/**
 * Pure function: turns a /reading-variants response into chip render state.
 * Chips are descriptive of which *enabled* riwayat share the displayed
 * form — never a selector, and never "Common to all" merely because only
 * one riwayah dataset happens to be enabled right now (that would imply a
 * verified cross-riwayah match that doesn't exist yet).
 */
export function computeReadingChipsState(params: {
  equivalentRiwayahIds: RiwayahId[] | null | undefined;
  hasReadingVariants: boolean;
  isLoading: boolean;
  isError: boolean;
}): ReadingChipsState {
  const { equivalentRiwayahIds, isLoading, isError } = params;
  if (isLoading) return { kind: "loading" };
  if (isError || !equivalentRiwayahIds || equivalentRiwayahIds.length === 0) {
    return { kind: "unavailable" };
  }

  const enabledCount = enabledRiwayahCount();
  const resolved = equivalentRiwayahIds
    .map((id) => getRiwayah(id))
    .filter((r): r is RiwayahDefinition => Boolean(r && r.isEnabled));

  if (resolved.length === 0) return { kind: "unavailable" };

  // Only ever "Common to all" when there is more than one enabled riwayah
  // AND every one of them is represented in the equivalence set — never
  // when there's just one enabled dataset in the whole registry.
  if (enabledCount > 1 && resolved.length === enabledCount) {
    return { kind: "common-to-all" };
  }

  const shown = resolved.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = Math.max(0, resolved.length - shown.length);
  return { kind: "riwayat", shown, all: resolved, overflowCount };
}

// ─── Qira'at panel rows ─────────────────────────────────────────────────

export interface QiraatPanelRow {
  riwayah: RiwayahDefinition;
  isCurrentlyDisplayed: boolean;
  isSelectable: boolean;
  statusLabel: string | null; // e.g. "Unavailable — dataset not yet integrated"
}

/**
 * Pure function: builds the "Currently displayed" + "Other readings" rows
 * for the Qira'at panel. Disabled riwayat are always present (so the
 * architecture is visibly ready for them) but never selectable.
 */
export function computeQiraatPanelRows(params: {
  displayedRiwayahId: RiwayahId;
  equivalentRiwayahIds: RiwayahId[];
}): { displayed: QiraatPanelRow[]; other: QiraatPanelRow[] } {
  const { displayedRiwayahId, equivalentRiwayahIds } = params;
  const equivalentSet = new Set(equivalentRiwayahIds);
  const all = listRiwayat();

  const displayed: QiraatPanelRow[] = [];
  const other: QiraatPanelRow[] = [];

  for (const riwayah of all) {
    const isCurrentlyDisplayed = riwayah.isEnabled && equivalentSet.has(riwayah.id);
    if (isCurrentlyDisplayed) {
      displayed.push({
        riwayah,
        isCurrentlyDisplayed: true,
        isSelectable: riwayah.id !== displayedRiwayahId,
        statusLabel: null,
      });
    } else {
      other.push({
        riwayah,
        isCurrentlyDisplayed: false,
        isSelectable: riwayah.isEnabled,
        statusLabel: riwayah.isEnabled ? null : "Unavailable — dataset not yet integrated",
      });
    }
  }

  return { displayed, other };
}

/** "Compare readings" is only meaningful once at least two riwayat have
 * verified enabled datasets — otherwise there is nothing to compare. */
export function canCompareReadings(): boolean {
  return enabledRiwayahCount() >= 2;
}

/** Accessible label combining the written name (never colour alone). */
export function riwayahAriaLabel(riwayah: RiwayahDefinition, extra?: string): string {
  const base = `${riwayah.displayName} (${riwayah.qiraahName})`;
  return extra ? `${base} — ${extra}` : base;
}
