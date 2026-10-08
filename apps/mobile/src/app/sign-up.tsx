import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Text } from "@/components/text";
import { useAuth } from "@/providers/auth";
import { GUTTER, space, TAP } from "@/theme";

export default function SignUp() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function submit() {
    setPending(true);
    setResult(null);
    const res = await signUp(fullName, email, password);
    setPending(false);
    if (!res.ok) setResult({ tone: "error", text: res.error });
    else if (res.message) setResult({ tone: "success", text: res.message });
    else router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <Text variant="small" tone="taupe">
          At least 8 characters with letters and numbers.
        </Text>
        {result && (
          <Text tone={result.tone} accessibilityLiveRegion="polite">
            {result.text}
          </Text>
        )}
        <Button label="Create account" loading={pending} onPress={submit} />
        <Pressable accessibilityRole="link" style={styles.link} onPress={() => router.replace("/sign-in")}>
          <Text tone="taupe">Already have an account? Sign in</Text>
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
