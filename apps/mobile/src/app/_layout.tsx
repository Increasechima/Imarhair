import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts, Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { BodoniModa_400Regular } from "@expo-google-fonts/bodoni-moda";
import { AuthProvider } from "@/providers/auth";
import { CartProvider } from "@/providers/cart";
import { colors, fonts } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, failed] = useFonts({ Jost_400Regular, Jost_500Medium, BodoniModa_400Regular });

  useEffect(() => {
    // System fonts are an acceptable fallback; never block the app on fonts.
    if (loaded || failed) void SplashScreen.hideAsync();
  }, [loaded, failed]);

  if (!loaded && !failed) return null;

  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.ivory },
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: fonts.sansMedium },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.ivory },
            headerBackButtonDisplayMode: "minimal",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[slug]" options={{ title: "" }} />
          <Stack.Screen name="sign-in" options={{ presentation: "modal", title: "Sign in" }} />
          <Stack.Screen name="sign-up" options={{ presentation: "modal", title: "Create account" }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
