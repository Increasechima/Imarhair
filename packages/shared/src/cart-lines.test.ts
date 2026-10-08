import { describe, expect, it } from "vitest";
import { formatLinesParam, parseLinesParam } from "./cart-lines";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("lines URL param", () => {
  it("round-trips", () => {
    const lines = [
      { variantId: A, quantity: 2 },
      { variantId: B, quantity: 1 },
    ];
    expect(parseLinesParam(formatLinesParam(lines))).toEqual(lines);
  });

  it("drops invalid entries and caps quantities", () => {
    expect(parseLinesParam(`${A}:99,not-a-uuid:1,${B}:0,${B}:x,`)).toEqual([{ variantId: A, quantity: 10 }]);
  });

  it("merges duplicates and handles empty input", () => {
    expect(parseLinesParam(`${A}:1,${A}:2`)).toEqual([{ variantId: A, quantity: 3 }]);
    expect(parseLinesParam(null)).toEqual([]);
    expect(parseLinesParam("")).toEqual([]);
  });
});
