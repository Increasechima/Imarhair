-- Allow the development-only "mock" payment provider (src/server/privileged/payments/mock.ts).
-- The app refuses to use it on the live deployment (src/server/env.ts).
alter table public.payments drop constraint payments_provider_check;
alter table public.payments
  add constraint payments_provider_check check (provider in ('paystack', 'flutterwave', 'mock'));
