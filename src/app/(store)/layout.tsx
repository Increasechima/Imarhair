import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { StoreProviders } from "@/components/layout/store-providers";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <StoreProviders>
      <a
        href="#main"
        className="text-label sr-only z-50 bg-ink px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
    </StoreProviders>
  );
}
