import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { priceDisplay, productBadge } from "@imarhair/shared/catalog/format";
import { storageImageUrl } from "@imarhair/shared/catalog/images";
import type { ProductSummary } from "@imarhair/shared/catalog/types";
import { Text } from "@/components/text";
import { env } from "@/lib/env";
import { colors, fonts, space } from "@/theme";

export function ProductCard({ product }: { product: ProductSummary }) {
  const price = priceDisplay(product);
  const badge = productBadge(product);
  const image = product.imagePaths[0];
  return (
    <Link href={{ pathname: "/product/[slug]", params: { slug: product.slug } }} asChild>
      <Pressable style={styles.card} accessibilityRole="link" accessibilityLabel={`${product.name}, ${price.label}`}>
        <View style={styles.imageWrap}>
          {image ? (
            <Image
              source={{ uri: storageImageUrl(env.supabaseUrl, image) }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              accessibilityLabel={product.imageAlts[0] ?? product.name}
            />
          ) : null}
          {badge && (
            <View style={styles.badge}>
              <Text variant="label" tone={badge === "Sold out" ? "error" : "ink"}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        <Text variant="body" style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text variant="price">{price.label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: space(1) },
  imageWrap: { aspectRatio: 4 / 5, backgroundColor: colors.sand, marginBottom: space(2) },
  image: { flex: 1 },
  badge: { position: "absolute", top: space(2), left: space(2), backgroundColor: colors.white, paddingHorizontal: space(2), paddingVertical: space(1) },
  name: { fontFamily: fonts.sansMedium },
});
