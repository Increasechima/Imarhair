import type { TextStyle } from "react-native";

// Design tokens from Style.md (mirrors apps/web/src/app/globals.css).
// Components use these names only, never raw hex values or ad-hoc sizes.

export const colors = {
  ink: "#111111",
  inkSoft: "#2a2a2a",
  gold: "#c4922b",
  goldDeep: "#a67a1f",
  white: "#ffffff",
  ivory: "#faf8f4",
  beige: "#f2ede5",
  sand: "#e6ddd0",
  line: "#e3ddd3",
  stone: "#8c847a",
  taupe: "#5f584f",
  success: "#2f6b4f",
  warning: "#9a6a14",
  error: "#a3362d",
  info: "#3b5568",
} as const;

export const fonts = {
  display: "BodoniModa_400Regular",
  sans: "Jost_400Regular",
  sansMedium: "Jost_500Medium",
} as const;

// Style.md §2, mobile column.
export const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 35 },
  h2: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  h3: { fontFamily: fonts.sansMedium, fontSize: 20, lineHeight: 26 },
  bodyLg: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 27 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24 },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 14, letterSpacing: 1.7, textTransform: "uppercase" },
  price: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 18, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

// 4px base unit (Tailwind scale).
export const space = (n: number) => n * 4;
export const radius = { sm: 2, pill: 999 } as const;
/** Minimum tap target (AGENTS.md). */
export const TAP = 44;
export const GUTTER = space(4);
