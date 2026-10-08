// Money is stored and computed as integer kobo (₦1 = 100 kobo). Format only
// at the edge. Never use floats for money.

const nairaWhole = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const nairaFraction = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 48_000_000 → "₦480,000"; 1_850_050 → "₦18,500.50" */
export function formatNaira(kobo: number): string {
  if (!Number.isSafeInteger(kobo)) throw new TypeError(`Invalid kobo amount: ${kobo}`);
  const sign = kobo < 0 ? "-" : "";
  const abs = Math.abs(kobo);
  const body = abs % 100 === 0 ? nairaWhole.format(abs / 100) : nairaFraction.format(abs / 100);
  return `${sign}₦${body}`;
}

/** Whole naira → kobo, e.g. for admin inputs. Rejects fractional kobo. */
export function nairaToKobo(naira: number): number {
  const kobo = Math.round(naira * 100);
  if (!Number.isSafeInteger(kobo) || Math.abs(kobo - naira * 100) > 1e-6) {
    throw new TypeError(`Invalid naira amount: ${naira}`);
  }
  return kobo;
}
