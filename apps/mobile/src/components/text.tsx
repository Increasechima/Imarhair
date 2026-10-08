import { Text as RNText, type TextProps } from "react-native";
import { colors, type as t } from "@/theme";

type Variant = keyof typeof t;
type Tone = "ink" | "taupe" | "stone" | "error" | "success" | "warning" | "white";

/** Text in one of the Style.md type roles. */
export function Text({ variant = "body", tone = "ink", style, ...props }: TextProps & { variant?: Variant; tone?: Tone }) {
  return <RNText {...props} style={[t[variant], { color: colors[tone] }, style]} />;
}
