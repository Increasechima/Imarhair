import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { formatNaira } from "@imarhair/shared/money";
import { getProduct } from "@imarhair/shared/catalog/queries";
import { storageImageUrl } from "@imarhair/shared/catalog/images";
import {
  choose,
  findVariant,
  initialVariant,
  maxQuantity,
  optionGroups,
  selectionFor,
  valueState,
  type Selection,
} from "@imarhair/shared/catalog/variants";
import { Button } from "@/components/button";
import { Empty, ErrorState, Loading } from "@/components/states";
import { Text } from "@/components/text";
import { env } from "@/lib/env";
import { catalog } from "@/lib/supabase";
import { useAsync } from "@/lib/use-async";
import { useCart } from "@/providers/cart";
import { colors, GUTTER, radius, space, TAP } from "@/theme";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const { add } = useCart();
  const { data: product, error, loading, retry } = useAsync(() => getProduct(catalog, slug), slug);

  const groups = useMemo(() => optionGroups(product?.variants ?? []), [product]);
  // The shopper's choice for THIS product; until they choose, the default variant.
  const [chosen, setChosen] = useState<{ productId: string; selection: Selection } | null>(null);
  const selection = useMemo<Selection>(() => {
    if (!product) return {};
    if (chosen?.productId === product.id) return chosen.selection;
    const first = initialVariant(product.variants);
    return first ? selectionFor(first, groups) : {};
  }, [product, groups, chosen]);

  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!product) return <Empty message="We couldn't find that product." action="Shop hair" onAction={() => router.replace("/shop")} />;

  const variant = findVariant(product.variants, selection) ?? (groups.length ? null : product.variants[0] ?? null);
  const max = maxQuantity(variant);
  const comingSoon = product.collectionStatus === "coming_soon";

  async function onAdd() {
    if (!variant) return;
    setAdding(true);
    setMessage(null);
    const ok = await add(variant.id, 1);
    setAdding(false);
    setMessage(ok ? { tone: "success", text: "Added to your bag" } : { tone: "error", text: "We couldn't update your bag. Please try again." });
  }

  return (
    <>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={styles.page}>
        <FlatList
          horizontal
          pagingEnabled
          data={product.images}
          keyExtractor={(i) => i.path}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Image
              source={{ uri: storageImageUrl(env.supabaseUrl, item.path) }}
              style={{ width, aspectRatio: 4 / 5, backgroundColor: colors.sand }}
              contentFit="cover"
              priority={index === 0 ? "high" : "low"}
              accessibilityLabel={item.alt || product.name}
            />
          )}
          ListEmptyComponent={<View style={{ width, aspectRatio: 4 / 5, backgroundColor: colors.sand }} />}
        />

        <View style={styles.body}>
          <Text variant="h1">{product.name}</Text>
          {variant && (
            <View style={styles.priceRow}>
              <Text variant="price">{formatNaira(variant.price)}</Text>
              {variant.compareAtPrice != null && variant.compareAtPrice > variant.price && (
                <Text variant="price" tone="stone" style={styles.struck}>
                  {formatNaira(variant.compareAtPrice)}
                </Text>
              )}
            </View>
          )}

          {groups.map((g) => (
            <View key={g.key} style={styles.group}>
              <Text variant="label" tone="taupe">
                {g.label}
              </Text>
              <View style={styles.values}>
                {g.values.map((v) => {
                  const state = valueState(product.variants, selection, g.key, v.value);
                  return (
                    <Pressable
                      key={String(v.value)}
                      accessibilityRole="button"
                      accessibilityLabel={`${g.label} ${v.label}${state === "sold-out" ? ", sold out" : ""}`}
                      accessibilityState={{ selected: state === "selected", disabled: state === "sold-out" }}
                      disabled={state === "sold-out"}
                      onPress={() => setChosen({ productId: product.id, selection: choose(product.variants, selection, g.key, v.value) })}
                      style={[styles.value, state === "selected" && styles.valueOn, state === "sold-out" && styles.valueOut]}
                    >
                      <Text
                        variant="small"
                        tone={state === "selected" ? "white" : state === "sold-out" ? "stone" : "ink"}
                        style={state === "sold-out" ? styles.struck : undefined}
                      >
                        {v.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {variant && variant.isLowStock && variant.available > 0 && (
            <Text variant="small" tone="warning">
              Only {variant.available} left
            </Text>
          )}

          <Button
            label={comingSoon ? "Coming soon" : max === 0 ? "Sold out" : "Add to bag"}
            disabled={comingSoon || !variant || max === 0}
            loading={adding}
            onPress={onAdd}
          />
          {message && (
            <View style={styles.added} accessibilityLiveRegion="polite">
              <Text tone={message.tone}>{message.text}</Text>
              {message.tone === "success" && (
                <Pressable accessibilityRole="link" style={styles.link} onPress={() => router.navigate("/bag")}>
                  <Text variant="label">View bag</Text>
                </Pressable>
              )}
            </View>
          )}

          {product.description && <Text tone="taupe">{product.description}</Text>}
          {product.details.length > 0 && (
            <View style={styles.group}>
              <Text variant="label" tone="taupe">
                Details
              </Text>
              {product.details.map(([k, v]) => (
                <Text key={k} variant="small">
                  {k}: {v}
                </Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: space(16) },
  body: { padding: GUTTER, gap: space(5) },
  priceRow: { flexDirection: "row", gap: space(3) },
  struck: { textDecorationLine: "line-through" },
  group: { gap: space(2) },
  values: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  value: {
    minHeight: TAP,
    minWidth: TAP,
    paddingHorizontal: space(4),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  valueOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  valueOut: { backgroundColor: colors.beige },
  added: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  link: { minHeight: TAP, justifyContent: "center", paddingHorizontal: space(2) },
});
