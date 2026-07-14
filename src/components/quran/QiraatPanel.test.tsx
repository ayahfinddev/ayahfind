import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QiraatPanel } from "./QiraatPanel";
import type { ReadingVariantsResponse } from "@/lib/types";

const hafsOnly: ReadingVariantsResponse = {
  surah: 1,
  ayah: 1,
  canonical_riwayah_id: "hafs-an-asim",
  equivalent_riwayah_ids: ["hafs-an-asim"],
  has_reading_variants: false,
};

describe("QiraatPanel — permanent button", () => {
  it("is always visible while loading", () => {
    render(<QiraatPanel surah={1} ayah={1} data={null} isLoading isError={false} />);
    expect(screen.getByRole("button", { name: /qira'at/i })).toBeInTheDocument();
  });

  it("is always visible on error", () => {
    render(<QiraatPanel surah={1} ayah={1} data={null} isLoading={false} isError />);
    expect(screen.getByRole("button", { name: /qira'at/i })).toBeInTheDocument();
  });

  it("is always visible with data loaded", () => {
    render(<QiraatPanel surah={1} ayah={1} data={hafsOnly} isLoading={false} isError={false} />);
    expect(screen.getByRole("button", { name: /qira'at/i })).toBeInTheDocument();
  });
});

describe("QiraatPanel — expanded panel", () => {
  it("shows Hafs checked under 'Currently displayed'", async () => {
    const user = userEvent.setup();
    render(<QiraatPanel surah={1} ayah={1} data={hafsOnly} isLoading={false} isError={false} />);
    await user.click(screen.getByRole("button", { name: /qira'at/i }));

    expect(screen.getByText("Currently displayed")).toBeInTheDocument();
    expect(screen.getByText("Hafs")).toBeInTheDocument();
  });

  it("lists other riwayat as unavailable and never as selectable buttons", async () => {
    const user = userEvent.setup();
    render(<QiraatPanel surah={1} ayah={1} data={hafsOnly} isLoading={false} isError={false} />);
    await user.click(screen.getByRole("button", { name: /qira'at/i }));

    const otherSection = screen.getByText("Other readings").closest("section")!;
    const rows = within(otherSection).getAllByRole("listitem");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(within(row).queryByRole("button")).not.toBeInTheDocument();
      expect(within(row).getByText(/unavailable/i)).toBeInTheDocument();
    }
  });

  it("disables 'Compare readings' until at least two riwayat are enabled", async () => {
    const user = userEvent.setup();
    render(<QiraatPanel surah={1} ayah={1} data={hafsOnly} isLoading={false} isError={false} />);
    await user.click(screen.getByRole("button", { name: /qira'at/i }));

    const compareButton = screen.getByRole("button", { name: /compare readings/i });
    expect(compareButton).toBeDisabled();
  });

  it("the 'Other readings' row scrolls horizontally instead of overflowing the panel", async () => {
    const user = userEvent.setup();
    render(<QiraatPanel surah={1} ayah={1} data={hafsOnly} isLoading={false} isError={false} />);
    await user.click(screen.getByRole("button", { name: /qira'at/i }));

    const otherSection = screen.getByText("Other readings").closest("section")!;
    const scrollRow = otherSection.querySelector('[role="list"]')!;
    expect(scrollRow.className).toContain("overflow-x-auto");
  });
});
