import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Text } from "@/components/text";
import { colors, fonts, radius, space, TAP } from "@/theme";

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="taupe">
        {label}
      </Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.stone} style={styles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space(2) },
  input: {
    minHeight: TAP + space(2),
    paddingHorizontal: space(3),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
});
