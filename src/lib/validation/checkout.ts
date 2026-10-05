import { z } from "zod";
import { emailSchema } from "@/lib/validation/auth";
import { isNigerianState } from "@/lib/ng-states";

export const COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
] as const;

const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];

/** Strips spaces, dashes and brackets: "0803 000 0000" → "08030000000". */
export const normalizePhone = (v: string) => v.replace(/[\s\-().]/g, "");

const NG_PHONE = /^(?:\+?234|0)[789][01]\d{8}$/;
const INTL_PHONE = /^\+?\d{7,15}$/;

const lineItem = z.object({ variant_id: z.uuid(), quantity: z.number().int().min(1).max(10) });
export const guestLinesSchema = z.array(lineItem).max(50);

export const checkoutSchema = z
  .object({
    fullName: z.string().trim().min(2, { error: "Enter your full name." }).max(120),
    email: emailSchema,
    phone: z.string().trim().transform(normalizePhone),
    line1: z.string().trim().min(3, { error: "Enter your street address." }).max(200),
    line2: z.string().trim().max(200).optional().default(""),
    city: z.string().trim().min(2, { error: "Enter your city or town." }).max(80),
    state: z.string().trim().min(2, { error: "Choose your state." }).max(80),
    country: z.enum(countryCodes, { error: "Choose your country." }),
    deliveryMethod: z.string().regex(/^[a-z_]+$/, { error: "Choose a delivery option." }),
    discountCode: z.string().trim().max(40).optional().default(""),
    saveAddress: z.boolean().optional().default(false),
  })
  .superRefine((v, ctx) => {
    const ok = v.country === "NG" ? NG_PHONE.test(v.phone) : INTL_PHONE.test(v.phone);
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: v.country === "NG" ? "Enter a valid Nigerian phone number, e.g. 0803 000 0000." : "Enter a valid phone number with country code.",
      });
    }
    if (v.country === "NG" && !isNigerianState(v.state)) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "Choose your state." });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

/** Saved address (account page) — same rules as the checkout address. */
export const addressSchema = z
  .object({
    fullName: z.string().trim().min(2, { error: "Enter the recipient's name." }).max(120),
    phone: z.string().trim().transform(normalizePhone),
    line1: z.string().trim().min(3, { error: "Enter the street address." }).max(200),
    line2: z.string().trim().max(200).optional().default(""),
    city: z.string().trim().min(2, { error: "Enter the city or town." }).max(80),
    state: z.string().trim().min(2, { error: "Choose the state." }).max(80),
    country: z.enum(countryCodes, { error: "Choose the country." }),
    isDefault: z.string().optional().transform((v) => v === "on"), // absent when unticked
  })
  .superRefine((v, ctx) => {
    const ok = v.country === "NG" ? NG_PHONE.test(v.phone) : INTL_PHONE.test(v.phone);
    if (!ok) ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid phone number." });
    if (v.country === "NG" && !isNigerianState(v.state)) ctx.addIssue({ code: "custom", path: ["state"], message: "Choose the state." });
  });
