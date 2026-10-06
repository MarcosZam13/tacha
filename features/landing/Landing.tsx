import { DemoSection } from "./components/DemoSection";
import { HeroSection } from "./components/HeroSection";
import { IntroSection } from "./components/IntroSection";
import { MoreInfoSection } from "./components/MoreInfoSection";
import { PublicLayout } from "./components/PublicLayout";
import { TestimonialsSection } from "./components/TestimonialsSection";

/** Página de inicio pública. Cada región es un componente de components/. */
export const Landing = (): React.JSX.Element => (
  <PublicLayout>
    <HeroSection />
    <IntroSection />
    <DemoSection />
    <TestimonialsSection />
    <MoreInfoSection />
  </PublicLayout>
);
