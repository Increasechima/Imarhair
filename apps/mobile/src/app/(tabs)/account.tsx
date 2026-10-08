import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Button } from "@/components/button";
import { Loading } from "@/components/states";
import { Text } from "@/components/text";
import { env } from "@/lib/env";
import { useAuth } from "@/providers/auth";
import { GUTTER, space } from "@/theme";

export default function Account() {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (session === undefined) return <Loading />;

  if (!session) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text variant="h2">Your account</Text>
        <Text tone="taupe">Sign in to keep your bag in step with imarhair.com and see your orders.</Text>
        <Button label="Sign in" onPress={() => router.push("/sign-in")} />
        <Button label="Create account" variant="secondary" onPress={() => router.push("/sign-up")} />
      </ScrollView>
    );
  }

  const name = (session.user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text variant="h2">{name ? `Welcome back, ${name}.` : "Welcome back."}</Text>
      <View style={styles.block}>
        <Text variant="label" tone="taupe">
          Signed in as
        </Text>
        <Text>{session.user.email}</Text>
      </View>
      {/* DECISION: v1 keeps orders and addresses on the website (account pages there). */}
      <Button
        label="Orders and addresses"
        variant="secondary"
        onPress={() => void WebBrowser.openBrowserAsync(`${env.siteUrl}/account`)}
      />
      <Button
        label="Sign out"
        variant="secondary"
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: GUTTER, gap: space(5) },
  block: { gap: space(1) },
});
