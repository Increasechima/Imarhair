import { Pressable, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Text } from "@/components/text";
import { colors, space, TAP } from "@/theme";

export function QuantityStepper({ value, max, onChange, label }: { value: number; max: number; onChange: (q: number) => void; label: string }) {
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${value}`}>
      <Step icon="minus" label={`Decrease ${label}`} disabled={value <= 1} onPress={() => onChange(value - 1)} />
      <Text variant="price" style={styles.value}>
        {value}
      </Text>
      <Step icon="plus" label={`Increase ${label}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
    </View>
  );
}

function Step({ icon, label, disabled, onPress }: { icon: "minus" | "plus"; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.step}
    >
      <Feather name={icon} size={16} color={disabled ? colors.stone : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line },
  step: { width: TAP, height: TAP, alignItems: "center", justifyContent: "center" },
  value: { minWidth: space(6), textAlign: "center" },
});
