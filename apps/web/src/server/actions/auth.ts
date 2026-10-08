"use server";

import { redirect } from "next/navigation";
import { authErrorMessage } from "@imarhair/shared/auth-errors";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";
import {
  fieldErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type FieldErrors,
} from "@imarhair/shared/validation/auth";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  values?: { email?: string; fullName?: string };
};



export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: authErrorMessage(error.code), values: { email } };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const parsed = signUpSchema.safeParse({ email, fullName, password: formData.get("password") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: { email, fullName } };
  }

  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { status: "error", message: authErrorMessage(error.code), values: { email, fullName } };
  }

  // Email confirmation disabled (some local setups): already signed in.
  if (data.session) redirect(next);

  // Same message whether or not the email already has an account,
  // so the form can't be used to discover who shops here.
  return {
    status: "success",
    message: `We've sent a confirmation link to ${parsed.data.email}. Open it to finish creating your account.`,
  };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error && (error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit")) {
    return { status: "error", message: authErrorMessage(error.code), values: { email } };
  }

  return {
    status: "success",
    message: `If there's an account for ${parsed.data.email}, a reset link is on its way.`,
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  const user = await getSessionUser();
  if (!user) {
    return {
      status: "error",
      message: "Your reset link has expired. Request a new one to continue.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: authErrorMessage(error.code) };
  }

  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
