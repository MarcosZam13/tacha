import { MissionVisionSection } from "./components/MissionVisionSection";
import { PublicLayout } from "./components/PublicLayout";
import { ABOUT_TEXT } from "./constants/landing.constants";

export const About = (): React.JSX.Element => (
  <PublicLayout>
    <header className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-12 text-center">
      <h1 className="font-display text-4xl font-bold text-tacha-text">{ABOUT_TEXT.TITLE}</h1>
      <p className="font-body text-base text-tacha-textsec">{ABOUT_TEXT.DESCRIPTION}</p>
    </header>
    <MissionVisionSection />
  </PublicLayout>
);
