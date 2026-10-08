import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useCart } from "@/providers/cart";
import { colors, fonts } from "@/theme";

type IconName = React.ComponentProps<typeof Feather>["name"];
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Feather name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  const { count } = useCart();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.stone,
        tabBarStyle: { backgroundColor: colors.ivory, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium },
        headerStyle: { backgroundColor: colors.ivory },
        headerTitleStyle: { fontFamily: fonts.sansMedium },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.ivory },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerTitle: "IMARHAIR", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarIcon: icon("grid") }} />
      <Tabs.Screen
        name="bag"
        options={{
          title: "Bag",
          tabBarIcon: icon("shopping-bag"),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.ink, color: colors.white },
          tabBarAccessibilityLabel: count > 0 ? `Bag, ${count} items` : "Bag",
        }}
      />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("user") }} />
    </Tabs>
  );
}
