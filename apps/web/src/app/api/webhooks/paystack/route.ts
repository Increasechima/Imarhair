import { NextResponse } from "next/server";
import { paystack } from "@/server/privileged/payments/paystack";
import { confirmPayment } from "@/server/privileged/orders";
import { supabaseAdmin } from "@/server/privileged/supabase-admin";
import type { Json } from "@imarhair/shared/database.types";

// Paystack webhook (Architecture.md §8.3). Signature checked over the RAW body,
// event stored once (idempotency), then the payment is verified with Paystack's
// API before anything is marked paid. Always 200 once safely recorded so
// Paystack stops retrying; 401 for bad signatures.
export async function POST(request: Request) {
  const rawBody = await request.text();
  let parsed;
  try {
    parsed = await paystack.parseWebhook(rawBody, request.headers);
  } catch (e) {
    // e.g. PAYMENT_SECRET_KEY not configured: refuse rather than accept unverifiable events.
    console.error("paystack webhook unavailable", (e as Error).message);
    return new NextResponse(null, { status: 503 });
  }
  if (!parsed.ok) {
    console.warn("paystack webhook rejected", { reason: parsed.reason });
    return new NextResponse(null, { status: parsed.reason === "bad_signature" ? 401 : 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("webhook_events").insert({
    provider: "paystack",
    event_id: parsed.eventId,
    type: parsed.type,
    payload: (parsed.payload ?? {}) as { [key: string]: Json },
  });
  if (error?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (error) {
    console.error("webhook_events insert failed", { code: error.code });
    return new NextResponse(null, { status: 500 }); // let Paystack retry
  }

  if (parsed.type === "payment.success" && parsed.reference) {
    try {
      await confirmPayment(parsed.reference);
    } catch (e) {
      console.error("webhook confirmPayment failed", { reference: parsed.reference, message: (e as Error).message });
      // Remove the event so Paystack's retry is processed again.
      await db.from("webhook_events").delete().eq("provider", "paystack").eq("event_id", parsed.eventId);
      return new NextResponse(null, { status: 500 });
    }
  }
  await db
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", "paystack")
    .eq("event_id", parsed.eventId);
  return NextResponse.json({ received: true });
}
