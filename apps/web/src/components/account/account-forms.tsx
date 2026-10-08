"use client";

import { useState } from "react";
import { useSubmitAction } from "@/lib/use-submit-action";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, SelectField } from "@/components/ui/field";
import { NIGERIAN_STATES } from "@imarhair/shared/ng-states";
import { COUNTRIES } from "@imarhair/shared/validation/checkout";
import { changePassword, saveAddress, updateProfile, type AccountFormState } from "@/server/actions/account";

const idle: AccountFormState = { status: "idle" };
const STATES = NIGERIAN_STATES.map((s) => ({ value: s, label: s }));
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

export type AddressValues = {
  id?: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  is_default: boolean;
};

function Message({ state }: { state: AccountFormState }) {
  if (state.status === "idle" || !state.message) return null;
  return <FormMessage tone={state.status === "ok" ? "success" : "error"}>{state.message}</FormMessage>;
}

export function AddressForm({ address, onDone }: { address?: AddressValues; onDone?: () => void }) {
  const [state, onSubmit, pending] = useSubmitAction(async (prev: AccountFormState, fd: FormData) => {
    const res = await saveAddress(prev, fd);
    if (res.status === "ok") onDone?.();
    return res;
  }, idle);
  const [country, setCountry] = useState(address?.country ?? "NG");
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {address?.id && <input type="hidden" name="id" value={address.id} />}
      <div className="sm:col-span-2">
        <Message state={state} />
      </div>
      <Field label="Full name" name="fullName" autoComplete="name" defaultValue={address?.full_name} error={e.fullName} />
      <Field label="Phone number" name="phone" type="tel" autoComplete="tel" defaultValue={address?.phone} error={e.phone} />
      <Field label="Street address" name="line1" autoComplete="address-line1" defaultValue={address?.line1} error={e.line1} className="sm:col-span-2" />
      <Field label="Apartment, landmark (optional)" name="line2" autoComplete="address-line2" defaultValue={address?.line2 ?? ""} className="sm:col-span-2" />
      <Field label="City / town" name="city" autoComplete="address-level2" defaultValue={address?.city} error={e.city} />
      {country === "NG" ? (
        <SelectField label="State" name="state" defaultValue={address?.state ?? ""} options={STATES} placeholder="Choose the state" error={e.state} />
      ) : (
        <Field label="State / region" name="state" defaultValue={address?.state} error={e.state} />
      )}
      <SelectField label="Country" name="country" value={country} onChange={(ev) => setCountry(ev.target.value)} options={COUNTRY_OPTIONS} className="sm:col-span-2" />
      <label className="text-small flex min-h-11 items-center gap-3 sm:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={address?.is_default} className="size-5 accent-ink" />
        Use as my default address
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          {address?.id ? "Save address" : "Add address"}
        </Button>
      </div>
    </form>
  );
}

export function ProfileForm({ profile }: { profile: { full_name: string | null; phone: string | null; marketing_opt_in: boolean; email: string } }) {
  const [state, onSubmit, pending] = useSubmitAction(updateProfile, idle);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-5">
      <Message state={state} />
      <Field label="Full name" name="fullName" autoComplete="name" defaultValue={profile.full_name ?? ""} error={e.fullName} />
      <Field label="Email" name="email" value={profile.email} readOnly hint="Contact us to change the email on your account." />
      <Field label="Phone number" name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} error={e.phone} />
      <label className="text-small flex min-h-11 items-center gap-3">
        <input type="checkbox" name="marketingOptIn" defaultChecked={profile.marketing_opt_in} className="size-5 accent-ink" />
        Email me about new drops and restocks
      </label>
      <div>
        <Button type="submit" loading={pending}>
          Save details
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, onSubmit, pending] = useSubmitAction(changePassword, idle);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-5">
      <Message state={state} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters, with letters and numbers." error={e.password} />
      <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" error={e.confirmPassword} />
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          Change password
        </Button>
      </div>
    </form>
  );
}
