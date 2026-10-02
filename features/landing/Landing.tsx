import { HeroSection } from "./components/HeroSection";
import { PublicFooter } from "./components/PublicFooter";
import { PublicNavbar } from "./components/PublicNavbar";

/** Página de inicio pública. Cada región es un componente de components/. */
export const Landing = (): React.JSX.Element => (
  <div className="flex min-h-screen flex-col">
    <PublicNavbar />
    <main className="flex-1">
      <HeroSection />
    </main>
    <PublicFooter />
  </div>
);
