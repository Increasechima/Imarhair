import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Text } from "@/components/text";
import { useAuth } from "@/providers/auth";
import { GUTTER, space, TAP } from "@/theme";

export default function SignIn() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "email" | "google") {
    setPending(kind);
    setError(null);
    const res = kind === "email" ? await signIn(email, password) : await signInWithGoogle();
    setPending(null);
    if (res.ok) router.back();
    else if (res.error) setError(res.error);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text tone="taupe">Use the same account as on imarhair.com. Your bag follows you.</Text>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
        {error && (
          <Text tone="error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Button label="Sign in" loading={pending === "email"} disabled={pending !== null} onPress={() => run("email")} />
        <Button label="Continue with Google" variant="secondary" loading={pending === "google"} disabled={pending !== null} onPress={() => run("google")} />
        <Pressable accessibilityRole="link" style={styles.link} onPress={() => router.replace("/sign-up")}>
          <Text tone="taupe">New here? Create an account</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: GUTTER, gap: space(5) },
  link: { minHeight: TAP, justifyContent: "center", alignItems: "center" },
});
