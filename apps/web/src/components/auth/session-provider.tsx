"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

// Whether the visitor is signed in, for client-side stores (bag, wishlist).
// Sign-in/out run in server actions (cookies set server-side), so the browser
// Supabase client emits no event; we re-read the session cookie on every route
// change (a local read, not a network call) as well as listening for events.
const SessionContext = createContext<boolean | null>(null);

/** null until known, then true/false. */
export const useSignedIn = () => useContext(SessionContext);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(Boolean(data.session));
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") setSignedIn(true);
      else if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session)) setSignedIn(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={signedIn}>{children}</SessionContext.Provider>;
}
