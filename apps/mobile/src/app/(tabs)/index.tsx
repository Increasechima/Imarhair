import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { getBestSellers, listCollections } from "@imarhair/shared/catalog/queries";
import { Button } from "@/components/button";
import { ProductCard } from "@/components/product-card";
import { ErrorState, Loading } from "@/components/states";
import { Text } from "@/components/text";
import { catalog } from "@/lib/supabase";
import { useAsync } from "@/lib/use-async";
import { colors, GUTTER, space, TAP } from "@/theme";

export default function Home() {
  const { data, error, loading, retry } = useAsync(
    async () => {
      const [bestSellers, collections] = await Promise.all([getBestSellers(catalog, 6), listCollections(catalog)]);
      return { bestSellers, collections: collections.filter((c) => c.status === "active") };
    },
    "home",
  );

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={retry} />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <Text variant="label" tone="taupe">
          Imarhair
        </Text>
        <Text variant="display">Classy. Confident. IMAR</Text>
        <Text variant="bodyLg" tone="taupe">
          Wigs, bundles and haircare products for elegant women.
        </Text>
        <Button label="Shop hair" onPress={() => router.push("/shop")} />
      </View>

      {data.bestSellers.length > 0 && (
        <View style={styles.section}>
          <Text variant="label" tone="taupe" style={styles.gutter}>
            Best sellers
          </Text>
          <FlatList
            horizontal
            data={data.bestSellers}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            renderItem={({ item }) => (
              <View style={styles.railItem}>
                <ProductCard product={item} />
              </View>
            )}
          />
        </View>
      )}

      {data.collections.length > 0 && (
        <View style={[styles.section, styles.gutter]}>
          <Text variant="label" tone="taupe">
            Collections
          </Text>
          {data.collections.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="link"
              accessibilityLabel={`Shop the ${c.name} collection`}
              style={styles.collection}
              onPress={() => router.push({ pathname: "/shop", params: { collection: c.slug } })}
            >
              <Text variant="h2">{c.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: space(16) },
  hero: { padding: GUTTER, paddingVertical: space(12), gap: space(6) },
  section: { marginTop: space(10), gap: space(4) },
  gutter: { paddingHorizontal: GUTTER },
  rail: { paddingHorizontal: GUTTER, gap: space(4) },
  railItem: { width: space(40) },
  collection: { minHeight: TAP, paddingVertical: space(4), borderTopWidth: 1, borderTopColor: colors.line },
});
