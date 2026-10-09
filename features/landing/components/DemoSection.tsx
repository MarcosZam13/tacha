import { DEMO_TEXT, LANDING_SECTION_ID } from "../constants/landing.constants";

export const DemoSection = (): React.JSX.Element => (
  <section id={LANDING_SECTION_ID.DEMO} className="bg-tacha-surface px-4 py-16 md:px-10">
    <div className="mx-auto flex aspect-video max-w-3xl items-center justify-center rounded-tacha-card border-2 border-dashed border-tacha-border">
      <p className="font-display text-2xl font-semibold text-tacha-textsec">{DEMO_TEXT.PLACEHOLDER}</p>
    </div>
  </section>
);
