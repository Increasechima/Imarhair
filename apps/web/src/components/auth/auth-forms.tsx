"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthFormState,
} from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";

const idle: AuthFormState = { status: "idle" };

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, idle);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Link href="/forgot-password" className="text-small -mt-2 self-end underline underline-offset-4">
        Forgot password?
      </Link>
      <Button type="submit" fullWidth loading={pending}>
        Sign in
      </Button>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, idle);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field
        label="Full name"
        name="fullName"
        autoComplete="name"
        required
        defaultValue={state.values?.fullName}
        error={state.fieldErrors?.fullName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with letters and numbers."
        error={state.fieldErrors?.password}
      />
      <Button type="submit" fullWidth loading={pending}>
        Create account
      </Button>
      <p className="text-small text-center text-taupe">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idle);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Button type="submit" fullWidth loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idle);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && (
        <FormMessage tone="error">
          {state.message}{" "}
          <Link href="/forgot-password" className="underline underline-offset-4">
            Request a new link
          </Link>
        </FormMessage>
      )}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with letters and numbers."
        error={state.fieldErrors?.password}
      />
      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" fullWidth loading={pending}>
        Update password
      </Button>
    </form>
  );
}
