import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

const SECRET = "sk_test_unit_only";
beforeAll(() => {
  process.env.PAYMENT_SECRET_KEY = SECRET;
});

const sign = (body: string, secret = SECRET) => createHmac("sha512", secret).update(body).digest("hex");

const event = JSON.stringify({
  event: "charge.success",
  data: {
    id: 4099260516,
    status: "success",
    reference: "IMR-20261005-001-P1",
    amount: 16300000,
    currency: "NGN",
    channel: "card",
    paid_at: "2026-10-05T10:00:00.000Z",
    gateway_response: "Successful",
    authorization: { authorization_code: "AUTH_secret", bin: "408408", last4: "4081", signature: "SIG_x" },
    customer: { email: "ada@example.com", customer_code: "CUS_x" },
  },
});

describe("paystack webhook", () => {
  it("accepts a correctly signed charge.success", async () => {
    const { paystack } = await import("./paystack");
    const res = await paystack.parseWebhook(event, new Headers({ "x-paystack-signature": sign(event) }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.type).toBe("payment.success");
    expect(res.reference).toBe("IMR-20261005-001-P1");
    expect(res.eventId).toBe("charge.success:4099260516");
  });

  it("never keeps card/authorization data in the stored payload", async () => {
    const { paystack } = await import("./paystack");
    const res = await paystack.parseWebhook(event, new Headers({ "x-paystack-signature": sign(event) }));
    const stored = JSON.stringify(res.ok ? res.payload : null);
    expect(stored).not.toMatch(/authorization|AUTH_secret|408408|4081|customer_code|SIG_x/);
    expect(stored).toContain("IMR-20261005-001-P1");
  });

  it.each([
    ["missing signature", undefined],
    ["wrong secret", sign(event, "sk_test_other")],
    ["tampered body", sign(event.replace("16300000", "100"))],
    ["garbage", "abc"],
  ])("rejects %s", async (_, signature) => {
    const { paystack } = await import("./paystack");
    const headers = new Headers(signature ? { "x-paystack-signature": signature } : {});
    const res = await paystack.parseWebhook(event, headers);
    expect(res).toEqual({ ok: false, reason: "bad_signature" });
  });
});
