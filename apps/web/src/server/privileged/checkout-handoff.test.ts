import { beforeEach, describe, expect, it, vi } from "vitest";

const generateLink = vi.fn();
vi.mock("@/server/privileged/supabase-admin", () => ({
  supabaseAdmin: () => ({ auth: { admin: { generateLink } } }),
}));

const { createCheckoutHandoff } = await import("./checkout-handoff");
const user = { id: "11111111-1111-4111-8111-111111111111", email: "ada@example.com" };

describe("createCheckoutHandoff", () => {
  beforeEach(() => {
    generateLink.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("links to /auth/confirm with a single-use token and next=/checkout", async () => {
    generateLink.mockResolvedValue({ data: { user: { id: user.id }, properties: { hashed_token: "abc123" } }, error: null });
    const url = new URL((await createCheckoutHandoff(user))!);
    expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: user.email });
    expect(url.pathname).toBe("/auth/confirm");
    expect(url.searchParams.get("token_hash")).toBe("abc123");
    expect(url.searchParams.get("type")).toBe("magiclink");
    expect(url.searchParams.get("next")).toBe("/checkout");
    expect([...url.searchParams.keys()].sort()).toEqual(["next", "token_hash", "type"]);
  });

  it("refuses a link that belongs to a different user", async () => {
    generateLink.mockResolvedValue({ data: { user: { id: "someone-else" }, properties: { hashed_token: "abc" } }, error: null });
    expect(await createCheckoutHandoff(user)).toBeNull();
  });

  it("returns null when the token has no email or Supabase errors", async () => {
    expect(await createCheckoutHandoff({ ...user, email: null })).toBeNull();
    expect(generateLink).not.toHaveBeenCalled();
    generateLink.mockResolvedValue({ data: { user: null, properties: null }, error: { code: "unexpected_failure" } });
    expect(await createCheckoutHandoff(user)).toBeNull();
  });
});
