import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { colors, GUTTER, space } from "@/theme";

// Loading, empty and error states for every async view (AGENTS.md).

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text tone="taupe" style={styles.copy}>
        {message}
      </Text>
      {onRetry && <Button label="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function Empty({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.center}>
      <Text variant="bodyLg" style={styles.copy}>
        {message}
      </Text>
      {action && onAction && <Button label={action} onPress={onAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: GUTTER, gap: space(4) },
  copy: { textAlign: "center" },
});
