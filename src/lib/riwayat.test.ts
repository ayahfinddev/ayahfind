import { describe, it, expect } from "vitest";
import {
  DEFAULT_RIWAYAH_ID,
  RIWAYAH_REGISTRY,
  RIWAYAH_THEME,
  COMMON_TO_ALL_THEME,
  canCompareReadings,
  computeQiraatPanelRows,
  computeReadingChipsState,
  enabledRiwayahCount,
  getRiwayah,
  getRiwayahTheme,
  isRiwayahEnabled,
  listRiwayat,
  resolveRiwayahId,
  riwayahAriaLabel,
} from "./riwayat";

describe("registry", () => {
  it("Hafs is the default and only enabled riwayah today", () => {
    expect(DEFAULT_RIWAYAH_ID).toBe("hafs-an-asim");
    const enabled = listRiwayat({ enabledOnly: true }).map((r) => r.id);
    expect(enabled).toEqual(["hafs-an-asim"]);
    expect(enabledRiwayahCount()).toBe(1);
  });

  it("registers every expected riwayah even though most are disabled", () => {
    const ids = Object.keys(RIWAYAH_REGISTRY);
    expect(ids).toEqual(
      expect.arrayContaining([
        "hafs-an-asim",
        "shubah-an-asim",
        "warsh-an-nafi",
        "qalun-an-nafi",
        "al-duri-an-abi-amr",
        "al-susi-an-abi-amr",
      ])
    );
  });

  it("disabled riwayat have no text/audio dataset", () => {
    for (const r of Object.values(RIWAYAH_REGISTRY)) {
      if (!r.isEnabled) {
        expect(r.textDatasetId).toBeNull();
        expect(r.audioDatasetId).toBeNull();
      }
    }
  });

  it("getRiwayah / isRiwayahEnabled handle unknown ids safely", () => {
    expect(getRiwayah("not-real")).toBeUndefined();
    expect(isRiwayahEnabled("not-real")).toBe(false);
    expect(isRiwayahEnabled(null)).toBe(false);
  });

  it("resolveRiwayahId falls back to Hafs for disabled/unknown/missing ids", () => {
    expect(resolveRiwayahId("warsh-an-nafi")).toBe(DEFAULT_RIWAYAH_ID);
    expect(resolveRiwayahId("not-real")).toBe(DEFAULT_RIWAYAH_ID);
    expect(resolveRiwayahId(null)).toBe(DEFAULT_RIWAYAH_ID);
    expect(resolveRiwayahId("hafs-an-asim")).toBe("hafs-an-asim");
  });

  it("canCompareReadings is false while only one riwayah is enabled", () => {
    expect(canCompareReadings()).toBe(false);
  });
});

describe("colour registry", () => {
  it("every riwayah has a distinct colour token with a theme entry", () => {
    const tokens = Object.values(RIWAYAH_REGISTRY).map((r) => r.colorToken);
    expect(new Set(tokens).size).toBe(tokens.length);
    for (const token of tokens) {
      expect(RIWAYAH_THEME[token]).toBeDefined();
    }
  });

  it("Common to all uses a neutral theme distinct from every riwayah's", () => {
    for (const theme of Object.values(RIWAYAH_THEME)) {
      expect(theme.foreground).not.toBe(COMMON_TO_ALL_THEME.foreground);
    }
  });

  it("getRiwayahTheme falls back to the neutral theme for an unknown token", () => {
    expect(getRiwayahTheme("does-not-exist")).toEqual(COMMON_TO_ALL_THEME);
  });

  it("Hafs' theme is resolvable via its colour token", () => {
    const hafs = getRiwayah("hafs-an-asim")!;
    expect(getRiwayahTheme(hafs.colorToken)).toBe(RIWAYAH_THEME.hafs);
  });
});

describe("computeReadingChipsState", () => {
  it("shows a loading state", () => {
    const state = computeReadingChipsState({
      equivalentRiwayahIds: null,
      hasReadingVariants: false,
      isLoading: true,
      isError: false,
    });
    expect(state.kind).toBe("loading");
  });

  it("shows unavailable on error or empty data", () => {
    const errorState = computeReadingChipsState({
      equivalentRiwayahIds: null,
      hasReadingVariants: false,
      isLoading: false,
      isError: true,
    });
    expect(errorState.kind).toBe("unavailable");

    const emptyState = computeReadingChipsState({
      equivalentRiwayahIds: [],
      hasReadingVariants: false,
      isLoading: false,
      isError: false,
    });
    expect(emptyState.kind).toBe("unavailable");
  });

  it("shows a single Hafs chip — never 'common to all' — when Hafs is the only enabled riwayah", () => {
    const state = computeReadingChipsState({
      equivalentRiwayahIds: ["hafs-an-asim"],
      hasReadingVariants: false,
      isLoading: false,
      isError: false,
    });
    expect(state.kind).toBe("riwayat");
    if (state.kind === "riwayat") {
      expect(state.shown.map((r) => r.id)).toEqual(["hafs-an-asim"]);
      expect(state.overflowCount).toBe(0);
    }
  });

  it("filters out disabled riwayat even if the backend somehow listed one", () => {
    const state = computeReadingChipsState({
      equivalentRiwayahIds: ["hafs-an-asim", "warsh-an-nafi"],
      hasReadingVariants: true,
      isLoading: false,
      isError: false,
    });
    expect(state.kind).toBe("riwayat");
    if (state.kind === "riwayat") {
      expect(state.all.map((r) => r.id)).toEqual(["hafs-an-asim"]);
    }
  });

  it("never renders 'common to all' merely because there is only one enabled dataset", () => {
    // Even though hafs-an-asim technically "is" every enabled riwayah right
    // now, the UI must not claim a verified cross-riwayah match that
    // doesn't exist — this is the core regression guard from the spec.
    const state = computeReadingChipsState({
      equivalentRiwayahIds: ["hafs-an-asim"],
      hasReadingVariants: false,
      isLoading: false,
      isError: false,
    });
    expect(state.kind).not.toBe("common-to-all");
  });
});

describe("computeQiraatPanelRows", () => {
  it("puts Hafs in 'displayed' and every other riwayah in 'other', marked unavailable", () => {
    const { displayed, other } = computeQiraatPanelRows({
      displayedRiwayahId: "hafs-an-asim",
      equivalentRiwayahIds: ["hafs-an-asim"],
    });
    expect(displayed.map((r) => r.riwayah.id)).toEqual(["hafs-an-asim"]);
    expect(other.length).toBeGreaterThan(0);
    for (const row of other) {
      expect(row.isSelectable).toBe(false);
      expect(row.statusLabel).toMatch(/unavailable/i);
    }
  });

  it("never marks a disabled riwayah as selectable", () => {
    const { other } = computeQiraatPanelRows({
      displayedRiwayahId: "hafs-an-asim",
      equivalentRiwayahIds: ["hafs-an-asim"],
    });
    const warsh = other.find((r) => r.riwayah.id === "warsh-an-nafi");
    expect(warsh?.isSelectable).toBe(false);
  });
});

describe("riwayahAriaLabel", () => {
  it("always includes the written riwayah name, never colour alone", () => {
    const hafs = getRiwayah("hafs-an-asim")!;
    const label = riwayahAriaLabel(hafs);
    expect(label).toContain(hafs.displayName);
    expect(label).toContain(hafs.qiraahName);
  });

  it("appends extra status text when provided", () => {
    const warsh = getRiwayah("warsh-an-nafi")!;
    const label = riwayahAriaLabel(warsh, "Unavailable — dataset not yet integrated");
    expect(label).toContain("Unavailable");
  });
});
