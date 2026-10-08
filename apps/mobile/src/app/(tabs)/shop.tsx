import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getFacets, listProducts } from "@imarhair/shared/catalog/queries";
import { PAGE_SIZE, parseShopParams } from "@imarhair/shared/catalog/shop-params";
import { Button } from "@/components/button";
import { ProductCard } from "@/components/product-card";
import { Empty, ErrorState, Loading } from "@/components/states";
import { Text } from "@/components/text";
import { catalog } from "@/lib/supabase";
import { useAsync } from "@/lib/use-async";
import { colors, GUTTER, radius, space, TAP } from "@/theme";

export default function Shop() {
  const { collection } = useLocalSearchParams<{ collection?: string }>();
  const [category, setCategory] = useState<string | null>(null);
  const [inStock, setInStock] = useState(false);
  const [page, setPage] = useState(1);

  const facets = useAsync(() => getFacets(catalog), "facets");
  // Same filter model and query as the website's /shop (shared shop-params).
  const params = parseShopParams({
    category: category ?? undefined,
    collection: collection ?? undefined,
    stock: inStock ? "1" : undefined,
    page: String(page),
  });
  const products = useAsync(() => listProducts(catalog, params), JSON.stringify(params));

  const chips = [{ slug: null, name: "All" }, ...(facets.data?.categories ?? [])];

  return (
    <View style={styles.page}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((c) => (
          <Chip
            key={c.slug ?? "all"}
            label={c.name}
            selected={category === c.slug}
            onPress={() => {
              setCategory(c.slug);
              setPage(1);
            }}
          />
        ))}
        <Chip
          label="In stock"
          selected={inStock}
          onPress={() => {
            setInStock((v) => !v);
            setPage(1);
          }}
        />
      </ScrollView>

      {products.loading && !products.data ? (
        <Loading />
      ) : products.error || !products.data ? (
        <ErrorState message={products.error ?? ""} onRetry={products.retry} />
      ) : products.data.products.length === 0 ? (
        <Empty message="Nothing matches those filters yet." />
      ) : (
        <FlatList
          data={products.data.products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => <ProductCard product={item} />}
          ListFooterComponent={
            products.data.total > page * PAGE_SIZE ? (
              <Button label="Show more" variant="secondary" loading={products.loading} onPress={() => setPage((p) => p + 1)} />
            ) : null
          }
        />
      )}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text variant="small" tone={selected ? "white" : "ink"}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  chips: { paddingHorizontal: GUTTER, paddingVertical: space(3), gap: space(2) },
  chip: {
    minHeight: TAP,
    paddingHorizontal: space(4),
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  grid: { paddingHorizontal: GUTTER, paddingBottom: space(16), gap: space(8) },
  row: { gap: space(4) },
});
