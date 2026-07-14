import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadingChips } from "./ReadingChips";
import { getRiwayah } from "@/lib/riwayat";
import type { ReadingVariantsResponse } from "@/lib/types";

const hafs = getRiwayah("hafs-an-asim")!;

const hafsOnly: ReadingVariantsResponse = {
  surah: 1,
  ayah: 1,
  canonical_riwayah_id: "hafs-an-asim",
  equivalent_riwayah_ids: ["hafs-an-asim"],
  has_reading_variants: false,
};

describe("ReadingChips", () => {
  it("shows a loading placeholder while fetching", () => {
    render(<ReadingChips data={null} isLoading isError={false} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders nothing when data is unavailable", () => {
    const { container } = render(<ReadingChips data={null} isLoading={false} isError />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a single Hafs chip when Hafs is the only enabled riwayah", () => {
    render(<ReadingChips data={hafsOnly} isLoading={false} isError={false} />);
    expect(screen.getByText("Hafs")).toBeInTheDocument();
  });

  it("never shows 'Common to all' merely because Hafs is the only enabled dataset", () => {
    render(<ReadingChips data={hafsOnly} isLoading={false} isError={false} />);
    expect(screen.queryByText(/common to all/i)).not.toBeInTheDocument();
  });

  it("chip carries the written riwayah name in its accessible label", () => {
    render(<ReadingChips data={hafsOnly} isLoading={false} isError={false} />);
    expect(screen.getByLabelText(new RegExp(hafs.displayName))).toBeInTheDocument();
  });
});
