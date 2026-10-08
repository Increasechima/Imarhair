import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./checkout";
import { guestLinesSchema } from "./checkout";
import { addLine, sanitizeLines } from "../cart-lines";

const base = {
  fullName: "Ada Obi",
  email: "Ada@Example.com",
  phone: "0803 000 0000",
  line1: "12 Admiralty Way",
  city: "Lekki",
  state: "Lagos",
  country: "NG",
  deliveryMethod: "standard",
};

describe("checkout validation", () => {
  it("accepts a Nigerian address and normalises phone + email", () => {
    const r = checkoutSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data?.phone).toBe("08030000000");
    expect(r.data?.email).toBe("ada@example.com");
  });

  it.each(["+2348030000000", "2348030000000", "07012345678", "09087654321"])("accepts NG phone %s", (phone) => {
    expect(checkoutSchema.safeParse({ ...base, phone }).success).toBe(true);
  });

  it.each(["0803000000", "12345", "06030000000", "+447700900000"])("rejects NG phone %s", (phone) => {
    const r = checkoutSchema.safeParse({ ...base, phone });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["phone"]);
  });

  it("requires a real Nigerian state when country is NG", () => {
    expect(checkoutSchema.safeParse({ ...base, state: "Atlantis" }).success).toBe(false);
  });

  it("allows international addresses with an international phone", () => {
    expect(checkoutSchema.safeParse({ ...base, country: "GB", state: "London", phone: "+44 7700 900000" }).success).toBe(true);
  });

  it("rejects unsupported countries and bad delivery codes", () => {
    expect(checkoutSchema.safeParse({ ...base, country: "XX" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, deliveryMethod: "drop table;" }).success).toBe(false);
  });
});

describe("guest bag", () => {
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";

  it("merges duplicate lines, caps at 10, drops junk", () => {
    expect(
      sanitizeLines([
        { variantId: a, quantity: 6 },
        { variantId: a, quantity: 6 },
        { variantId: "not-a-uuid", quantity: 1 },
        { variantId: b, quantity: 0 },
        "junk",
      ]),
    ).toEqual([{ variantId: a, quantity: 10 }]);
  });

  it("addLine adds to an existing line", () => {
    expect(addLine([{ variantId: a, quantity: 2 }], a, 3)).toEqual([{ variantId: a, quantity: 5 }]);
    expect(addLine([{ variantId: a, quantity: 2 }], b, 1)).toHaveLength(2);
  });

  it("server-side schema limits what guests can post", () => {
    expect(guestLinesSchema.safeParse([{ variant_id: a, quantity: 11 }]).success).toBe(false);
    expect(guestLinesSchema.safeParse(Array.from({ length: 51 }, () => ({ variant_id: a, quantity: 1 }))).success).toBe(false);
  });
});
