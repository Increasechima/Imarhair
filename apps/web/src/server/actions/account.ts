"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { addressSchema } from "@imarhair/shared/validation/checkout";
import { fieldErrors, passwordSchema, type FieldErrors } from "@imarhair/shared/validation/auth";

// Customer self-service (prd.md §6.10). Everything runs on the customer's own
// session, so RLS limits it to their rows; profiles.role can't be changed
// (column grants), whatever is posted.

export type AccountFormState = { status: "idle" | "ok" | "error"; message?: string; fieldErrors?: FieldErrors };

const SIGNED_OUT: AccountFormState = { status: "error", message: "Please sign in again." };
const uuid = z.uuid();

export async function saveAddress(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const id = formData.get("id") ? String(formData.get("id")) : null;
  if (id && !uuid.safeParse(id).success) return { status: "error", message: "Invalid address." };
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();

  const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true });
  const makeDefault = d.isDefault || !count;
  if (makeDefault) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id).neq("id", id ?? "00000000-0000-0000-0000-000000000000");

  const row = {
    user_id: user.id,
    full_name: d.fullName,
    phone: d.phone,
    line1: d.line1,
    line2: d.line2 || null,
    city: d.city,
    state: d.state,
    country: d.country,
    is_default: makeDefault,
  };
  const { error } = id ? await supabase.from("addresses").update(row).eq("id", id) : await supabase.from("addresses").insert(row);
  if (error) return { status: "error", message: "Couldn't save the address. Please try again." };
  refresh();
  return { status: "ok", message: id ? "Address updated." : "Address saved." };
}

export async function addressAction(formData: FormData) {
  const user = await getSessionUser();
  const id = uuid.safeParse(formData.get("id"));
  if (!user || !id.success) return;
  const supabase = await createClient();
  if (formData.get("intent") === "delete") {
    const { data: removed } = await supabase.from("addresses").delete().eq("id", id.data).select("is_default");
    // Keep one default if any addresses remain.
    if (removed?.[0]?.is_default) {
      const { data: next } = await supabase.from("addresses").select("id").order("created_at", { ascending: false }).limit(1);
      if (next?.[0]) await supabase.from("addresses").update({ is_default: true }).eq("id", next[0].id);
    }
  } else if (formData.get("intent") === "default") {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id.data);
  }
  refresh();
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, { error: "Enter your name." }).max(120),
  phone: z
    .string()
    .trim()
    .max(32)
    .transform((v) => v.replace(/[\s\-().]/g, "") || null)
    .refine((v) => v === null || /^\+?\d{7,15}$/.test(v), { error: "Enter a valid phone number." }),
  marketingOptIn: z.string().optional().transform((v) => v === "on"), // absent when unticked
});

export async function updateProfile(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone, marketing_opt_in: parsed.data.marketingOptIn })
    .eq("id", user.id);
  if (error) return { status: "error", message: "Couldn't save your details." };
  refresh();
  return { status: "ok", message: "Details saved." };
}

export async function changePassword(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const parsed = z
    .object({ password: passwordSchema, confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], error: "Passwords don't match." })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "same_password"
          ? "Your new password must be different from your current one."
          : error.code === "reauthentication_needed"
            ? "For security, sign out and sign in again, then change your password."
            : "Couldn't change your password. Please try again.",
    };
  }
  return { status: "ok", message: "Password changed." };
}
