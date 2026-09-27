import { describe, expect, it } from "vitest";
import { resolveIconValue } from "./iconValue";

describe("resolveIconValue", () => {
  it("keeps uploaded and legacy asset URLs as image icons", () => {
    expect(resolveIconValue("/uploads/wrench.svg")).toEqual({
      kind: "image",
      src: "/uploads/wrench.svg",
    });
  });

  it("recovers image-icon URLs from legacy ImageRef objects", () => {
    expect(resolveIconValue({ src: "/images/icon.svg" })).toEqual({
      kind: "image",
      src: "/images/icon.svg",
    });
  });

  it("resolves registered Lucide names and falls back safely", () => {
    expect(resolveIconValue("Wrench")).toEqual({
      kind: "lucide",
      name: "Wrench",
    });
    expect(resolveIconValue("not-an-icon", "Building")).toEqual({
      kind: "lucide",
      name: "Building",
    });
  });

  it("maps legacy featured-service aliases to their image URLs", () => {
    expect(resolveIconValue("building")).toEqual({
      kind: "image",
      src: "/images/services-icons/building-contracting.svg",
    });
  });
});
