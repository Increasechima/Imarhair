This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Imarhair specifics

Read the root `AGENTS.md` first; its hard rules apply here too.

- **Same backend as the website.** Same Supabase project and Auth (one account for both). Catalogue reads use the shared queries in `@imarhair/shared/catalog/queries` with the anonymous `catalog` client. The bag goes through the website's `/api/v1` routes (`src/lib/api.ts`, contract in `@imarhair/shared/api`). Never compute prices, totals or discounts in the app.
- **Live bag.** `src/providers/cart.tsx` listens on the private Realtime topic `cart:<user_id>` and re-fetches the bag on each ping. Pings carry no data.
- **Checkout** runs on the website in an in-app browser (`src/lib/checkout.ts`). Don't build native payment without a security review.
- **Secrets:** everything in `EXPO_PUBLIC_*` ships inside the app. Only the Supabase URL, the anon key and the site URL belong there.
- **Styling:** use `src/theme.ts` (the Style.md tokens). No raw hex values in components. Tap targets ≥ 44 (`TAP`), and every pressable needs an accessibility label.
- **Install packages** with `npx expo install <pkg>`. If it can't find pnpm, run the `pnpm add` it prints. `@types/react` is pinned to the website's version (see `expo.install.exclude`) so both apps share one React type set.
