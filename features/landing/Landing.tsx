import { HeroSection } from "./components/HeroSection";
import { IntroSection } from "./components/IntroSection";
import { MoreInfoSection } from "./components/MoreInfoSection";
import { PublicFooter } from "./components/PublicFooter";
import { PublicNavbar } from "./components/PublicNavbar";

/** Página de inicio pública. Cada región es un componente de components/. */
export const Landing = (): React.JSX.Element => (
  <div className="flex min-h-screen flex-col">
    <PublicNavbar />
    <main className="flex-1">
      <HeroSection />
      <IntroSection />
      <MoreInfoSection />
    </main>
    <PublicFooter />
  </div>
);
