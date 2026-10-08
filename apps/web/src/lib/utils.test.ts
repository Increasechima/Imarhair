import { describe, expect, it } from "vitest";
import { safeNextPath } from "./utils";
import { deliveryZoneFor, NIGERIAN_STATES } from "@imarhair/shared/ng-states";
import { signUpSchema, resetPasswordSchema } from "@imarhair/shared/validation/auth";

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/checkout")).toBe("/checkout");
    expect(safeNextPath("/account/orders?page=2")).toBe("/account/orders?page=2");
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", "/a\r\nSet-Cookie: x"])(
    "blocks %j",
    (next) => {
      expect(safeNextPath(next)).toBe("/account");
    },
  );

  it("falls back for non-strings", () => {
    expect(safeNextPath(null, "/")).toBe("/");
    expect(safeNextPath(["/a"], "/")).toBe("/");
  });
});

describe("Nigerian states", () => {
  it("lists 36 states + FCT", () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
  });

  it("resolves delivery zones", () => {
    expect(deliveryZoneFor("NG", "Lagos")).toBe("lagos");
    expect(deliveryZoneFor("ng", "Rivers")).toBe("nigeria");
    expect(deliveryZoneFor("GB", "London")).toBe("international");
  });
});

describe("auth validation", () => {
  it("normalises email and accepts a valid sign-up", () => {
    const r = signUpSchema.safeParse({ fullName: " Ada Obi ", email: " Ada@Example.COM ", password: "queen2026" });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ fullName: "Ada Obi", email: "ada@example.com", password: "queen2026" });
  });

  it("requires letters and numbers in passwords", () => {
    expect(signUpSchema.safeParse({ fullName: "Ada", email: "a@b.co", password: "abcdefgh" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "Ada", email: "a@b.co", password: "12345678" }).success).toBe(false);
  });

  it("requires matching passwords on reset", () => {
    const r = resetPasswordSchema.safeParse({ password: "queen2026", confirmPassword: "queen2027" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
