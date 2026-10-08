import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from "react-native";
import { Text } from "@/components/text";
import { colors, radius, space, TAP } from "@/theme";

type Props = Omit<PressableProps, "children"> & {
  label: string;
  variant?: "primary" | "secondary";
  loading?: boolean;
};

/** Primary buttons are ink (Style.md); labels use the tracked uppercase style. */
export function Button({ label, variant = "primary", loading, disabled, style, ...props }: Props) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        state.pressed && styles.pressed,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.white : colors.ink} />
      ) : (
        <Text variant="label" tone={primary ? "white" : "ink"}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TAP + space(4),
    paddingHorizontal: space(6),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
