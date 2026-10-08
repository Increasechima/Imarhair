import { describe, expect, it } from "vitest";
import { formatNaira, nairaToKobo } from "./money";

describe("formatNaira", () => {
  it("formats whole naira without decimals", () => {
    expect(formatNaira(48_000_000)).toBe("₦480,000");
    expect(formatNaira(15_800_000)).toBe("₦158,000");
    expect(formatNaira(0)).toBe("₦0");
  });

  it("shows kobo only when present", () => {
    expect(formatNaira(1_850_050)).toBe("₦18,500.50");
    expect(formatNaira(5)).toBe("₦0.05");
  });

  it("handles negatives (refunds, discounts)", () => {
    expect(formatNaira(-500_000)).toBe("-₦5,000");
  });

  it("rejects non-integer kobo", () => {
    expect(() => formatNaira(10.5)).toThrow();
  });
});

describe("nairaToKobo", () => {
  it("converts naira to integer kobo", () => {
    expect(nairaToKobo(480_000)).toBe(48_000_000);
    expect(nairaToKobo(18_500.5)).toBe(1_850_050);
  });

  it("rejects fractions of a kobo", () => {
    expect(() => nairaToKobo(1.005)).toThrow();
  });
});
