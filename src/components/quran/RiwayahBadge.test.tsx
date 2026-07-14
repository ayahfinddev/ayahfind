import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommonToAllBadge, RiwayahBadge } from "./RiwayahBadge";
import { COMMON_TO_ALL_THEME, getRiwayah, getRiwayahTheme } from "@/lib/riwayat";

const hafs = getRiwayah("hafs-an-asim")!;
const warsh = getRiwayah("warsh-an-nafi")!;

describe("RiwayahBadge — enabled riwayah", () => {
  it("shows the written short name, not colour alone", () => {
    render(<RiwayahBadge riwayah={hafs} />);
    expect(screen.getByText("Hafs")).toBeInTheDocument();
  });

  it("carries an accessible label with the full name and qira'ah", () => {
    render(<RiwayahBadge riwayah={hafs} />);
    const badge = screen.getByLabelText(new RegExp(hafs.displayName));
    expect(badge).toHaveAttribute("aria-label", expect.stringContaining(hafs.qiraahName));
  });

  it("applies the colour registry's theme via CSS custom properties", () => {
    const { container } = render(<RiwayahBadge riwayah={hafs} />);
    const badge = container.querySelector(".riwayah-badge") as HTMLElement;
    const theme = getRiwayahTheme(hafs.colorToken);
    expect(badge.style.getPropertyValue("--rw-bg")).toBe(theme.background);
    expect(badge.style.getPropertyValue("--rw-fg")).toBe(theme.foreground);
  });

  it("renders the same colour for the same riwayah regardless of variant", () => {
    const { container: chipContainer } = render(<RiwayahBadge riwayah={hafs} variant="chip" />);
    const { container: rowContainer } = render(<RiwayahBadge riwayah={hafs} variant="row" />);
    const chipBg = chipContainer.querySelector(".riwayah-badge")?.getAttribute("style");
    const rowBg = rowContainer.querySelector(".riwayah-badge")?.getAttribute("style");
    expect(chipBg).toContain(getRiwayahTheme(hafs.colorToken).background);
    expect(rowBg).toContain(getRiwayahTheme(hafs.colorToken).background);
  });

  it("shows a checkmark only when selected", () => {
    const { container } = render(<RiwayahBadge riwayah={hafs} selected />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("RiwayahBadge — disabled riwayah", () => {
  it("never renders as a clickable element", () => {
    render(<RiwayahBadge riwayah={warsh} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows an explicit unavailable status, not just a muted colour", () => {
    render(<RiwayahBadge riwayah={warsh} statusLabel="Unavailable — dataset not yet integrated" />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });

  it("does not use the riwayah's registry colour while unavailable", () => {
    const { container } = render(<RiwayahBadge riwayah={warsh} />);
    expect(container.querySelector(".riwayah-badge")).not.toBeInTheDocument();
  });
});

describe("CommonToAllBadge", () => {
  it("uses the neutral theme, not any riwayah's colour", () => {
    const { container } = render(<CommonToAllBadge />);
    const badge = container.querySelector(".riwayah-badge")!;
    expect(badge.getAttribute("style")).toContain(COMMON_TO_ALL_THEME.background);
    expect(screen.getByText("Common to all")).toBeInTheDocument();
  });
});
