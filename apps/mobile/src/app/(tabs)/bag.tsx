import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { formatNaira } from "@imarhair/shared/money";
import { ISSUE_MESSAGE } from "@imarhair/shared/orders";
import { storageImageUrl } from "@imarhair/shared/catalog/images";
import { Button } from "@/components/button";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Empty, ErrorState, Loading } from "@/components/states";
import { Text } from "@/components/text";
import { openCheckout } from "@/lib/checkout";
import { env } from "@/lib/env";
import { useAuth } from "@/providers/auth";
import { useCart } from "@/providers/cart";
import { colors, fonts, GUTTER, space, TAP } from "@/theme";

export default function Bag() {
  const { session } = useAuth();
  const { view, lines, error, loading, setQuantity, remove, refresh } = useCart();
  const [opening, setOpening] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  if (!view && loading) return <Loading />;
  if (!view) return <ErrorState message={error ?? "We couldn't load your bag. Please refresh."} onRetry={refresh} />;
  if (view.lines.length === 0) return <Empty message="Your bag is empty." action="Shop hair" onAction={() => router.navigate("/shop")} />;

  async function checkout() {
    setOpening(true);
    setCheckoutError(null);
    const err = await openCheckout({ signedIn: Boolean(session), lines });
    setOpening(false);
    if (err) setCheckoutError(err);
    // Back from the browser: show what's left (paid lines are removed server-side).
    await refresh();
  }

  return (
    <FlatList
      data={view.lines}
      keyExtractor={(l) => l.variantId}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refresh();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={error ? <Text tone="error">{error}</Text> : null}
      renderItem={({ item: line }) => {
        const gone = line.issue === "unavailable" || line.issue === "sold_out";
        const max = Math.max(1, Math.min(10, line.available || line.quantity));
        return (
          <View style={styles.line}>
            <View style={styles.thumb}>
              {line.imagePath && (
                <Image source={{ uri: storageImageUrl(env.supabaseUrl, line.imagePath) }} style={styles.thumbImg} contentFit="cover" />
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{line.productName}</Text>
              {line.variantLabel && (
                <Text variant="small" tone="taupe">
                  {line.variantLabel}
                </Text>
              )}
              {line.unitPrice != null && <Text variant="price">{formatNaira(line.unitPrice)}</Text>}
              {line.issue && (
                <Text variant="small" tone="error">
                  {ISSUE_MESSAGE[line.issue](line.available)}
                </Text>
              )}
              <View style={styles.actions}>
                {gone ? (
                  <View />
                ) : (
                  <QuantityStepper
                    value={line.quantity}
                    max={max}
                    onChange={(q) => void setQuantity(line.variantId, q)}
                    label={`quantity for ${line.productName ?? "item"}`}
                  />
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${line.productName ?? "item"}`}
                  onPress={() => void remove(line.variantId)}
                  style={styles.remove}
                >
                  <Text variant="small" tone="taupe" style={styles.underline}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      }}
      ListFooterComponent={
        <View style={styles.summary}>
          <View style={styles.subtotal}>
            <Text tone="taupe">Subtotal</Text>
            <Text variant="price">{formatNaira(view.subtotal)}</Text>
          </View>
          <View style={styles.subtotal}>
            <Text tone="taupe">Delivery</Text>
            <Text variant="small" tone="taupe">
              Calculated at checkout
            </Text>
          </View>
          {view.issues > 0 && (
            <Text variant="small" tone="error" accessibilityLiveRegion="polite">
              Update the highlighted items to continue.
            </Text>
          )}
          {checkoutError && (
            <Text variant="small" tone="error" accessibilityLiveRegion="polite">
              {checkoutError}
            </Text>
          )}
          <Button label="Checkout" disabled={view.issues > 0} loading={opening} onPress={checkout} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: GUTTER, gap: space(6), paddingBottom: space(16) },
  line: { flexDirection: "row", gap: space(4) },
  thumb: { width: space(24), aspectRatio: 4 / 5, backgroundColor: colors.sand },
  thumbImg: { flex: 1 },
  info: { flex: 1, gap: space(1) },
  name: { fontFamily: fonts.sansMedium },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space(2) },
  remove: { minHeight: TAP, justifyContent: "center" },
  underline: { textDecorationLine: "underline" },
  summary: { gap: space(3), borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(6) },
  subtotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
