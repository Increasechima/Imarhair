"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * useActionState for forms that must KEEP what the user typed when the server
 * returns a validation error. Passing an action to <form action> makes React 19
 * reset uncontrolled fields after every submission, even failed ones; running
 * the action from onSubmit inside a transition avoids that.
 */
export function useSubmitAction<S>(action: (state: Awaited<S>, formData: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, formAction, pending] = useActionState(action, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => formAction(data));
  };
  return [state, onSubmit, pending] as const;
}
