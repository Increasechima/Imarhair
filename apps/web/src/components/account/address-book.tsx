"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { AddressForm, type AddressValues } from "@/components/account/account-forms";
import { addressAction } from "@/server/actions/account";

function RowButton({ children, value, danger }: { children: string; value: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (danger && !window.confirm("Delete this address?")) e.preventDefault();
      }}
      className={`text-small inline-flex min-h-11 items-center underline underline-offset-4 disabled:opacity-50 ${danger ? "text-error" : ""}`}
    >
      {children}
    </button>
  );
}

export function AddressBook({ addresses }: { addresses: (AddressValues & { id: string })[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length ? null : "new");
  // The form closes on success, so the confirmation lives here.
  const [notice, setNotice] = useState<string | null>(null);
  const done = (message: string) => () => {
    setEditing(null);
    setNotice(message);
  };

  return (
    <div className="flex flex-col gap-4">
      {notice && <FormMessage tone="success">{notice}</FormMessage>}
      {addresses.map((a) =>
        editing === a.id ? (
          <div key={a.id} className="border border-ink bg-white p-5">
            <AddressForm address={a} onDone={done("Address updated.")} />
            <Button variant="text" className="mt-2" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div key={a.id} className="flex flex-wrap items-start justify-between gap-4 border border-line bg-white p-5">
            <address className="text-body not-italic">
              <span className="font-medium">{a.full_name}</span>
              {a.is_default && <span className="text-badge ml-2 rounded-pill bg-beige px-2 py-0.5">Default</span>}
              <span className="block text-taupe">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
              </span>
              <span className="block text-taupe">
                {a.city}, {a.state}
              </span>
              <span className="block text-taupe">{a.phone}</span>
            </address>
            <div className="flex gap-4">
              <button type="button" onClick={() => {
                  setNotice(null);
                  setEditing(a.id);
                }} className="text-small inline-flex min-h-11 items-center underline underline-offset-4">
                Edit
              </button>
              <form action={addressAction} className="flex gap-4">
                <input type="hidden" name="id" value={a.id} />
                {!a.is_default && <RowButton value="default">Make default</RowButton>}
                <RowButton value="delete" danger>
                  Delete
                </RowButton>
              </form>
            </div>
          </div>
        ),
      )}

      {editing === "new" ? (
        <div className="border border-ink bg-white p-5">
          <h2 className="text-h3 mb-5">New address</h2>
          <AddressForm onDone={done("Address saved.")} />
          {addresses.length > 0 && (
            <Button variant="text" className="mt-2" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          )}
        </div>
      ) : (
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setNotice(null);
              setEditing("new");
            }}
          >
            Add an address
          </Button>
        </div>
      )}
    </div>
  );
}
