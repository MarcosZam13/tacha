import { ContactSection } from "./components/ContactSection";
import { DemoSection } from "./components/DemoSection";
import { HeroSection } from "./components/HeroSection";
import { IntroSection } from "./components/IntroSection";
import { MoreInfoSection } from "./components/MoreInfoSection";
import { PublicLayout } from "./components/PublicLayout";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { CONTACT_SOURCE } from "./constants/contact.constants";

/** Página de inicio pública. Cada región es un componente de components/. */
export const Landing = (): React.JSX.Element => (
  <PublicLayout>
    <HeroSection />
    <IntroSection />
    <DemoSection />
    <TestimonialsSection />
    <MoreInfoSection />
    <ContactSection source={CONTACT_SOURCE.LANDING} />
  </PublicLayout>
);
