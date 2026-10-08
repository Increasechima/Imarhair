import * as SecureStore from "expo-secure-store";

// Key-value storage in the iOS Keychain / Android Keystore. Supabase sessions
// can exceed what SecureStore holds comfortably in one value (~2 KB on
// Android), so values are split into chunks: `<key>.n` holds the count.

const CHUNK = 1800;
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

async function count(key: string): Promise<number> {
  return Number((await SecureStore.getItemAsync(`${safe(key)}.n`)) ?? 0);
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = await count(key);
    if (!n) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${safe(key)}.${i}`)));
    return parts.some((p) => p == null) ? null : parts.join("");
  },
  async setItem(key: string, value: string): Promise<void> {
    const old = await count(key);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, "g")) ?? [""];
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(`${safe(key)}.${i}`, c)));
    await SecureStore.setItemAsync(`${safe(key)}.n`, String(chunks.length));
    for (let i = chunks.length; i < old; i++) await SecureStore.deleteItemAsync(`${safe(key)}.${i}`);
  },
  async removeItem(key: string): Promise<void> {
    const n = await count(key);
    await SecureStore.deleteItemAsync(`${safe(key)}.n`);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${safe(key)}.${i}`);
  },
};
