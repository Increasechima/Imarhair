import "server-only";

// Server-only configuration. Never import this from client components.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example and README.md.`);
  return value;
}

const isLiveDeployment = process.env.VERCEL_ENV === "production";

export const serverEnv = {
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },

  /**
   * "paystack" in real environments. "mock" is a development-only stand-in
   * that never touches money; it is refused on the live deployment and in
   * production builds unless ALLOW_MOCK_PAYMENTS=true (local `next start`).
   */
  get paymentProvider(): "paystack" | "mock" {
    const p = (process.env.PAYMENT_PROVIDER ?? "paystack").toLowerCase();
    if (p === "mock") {
      const allowed =
        !isLiveDeployment && (process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "true");
      if (!allowed) throw new Error("PAYMENT_PROVIDER=mock is not allowed in this environment.");
      return "mock";
    }
    if (p !== "paystack") throw new Error(`Unsupported PAYMENT_PROVIDER "${p}".`);
    return "paystack";
  },
  get paystackSecretKey() {
    return required("PAYMENT_SECRET_KEY");
  },

  get emailTransport(): "mailgun" | "log" {
    return process.env.EMAIL_TRANSPORT === "mailgun" ? "mailgun" : "log";
  },
  get mailgun() {
    return {
      apiKey: required("MAILGUN_API_KEY"),
      domain: required("MAILGUN_DOMAIN"),
      apiBase: (process.env.MAILGUN_API_BASE ?? "https://api.mailgun.net").replace(/\/$/, ""),
    };
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "Imarhair <orders@imarhair.com>";
  },
  get supportEmail() {
    return process.env.SUPPORT_EMAIL || null;
  },
  get supportPhone() {
    return process.env.SUPPORT_PHONE || null;
  },
  isLiveDeployment,
};
