import { ABOUT_TEXT } from "../constants/landing.constants";

export const MissionVisionSection = (): React.JSX.Element => (
  <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-12 md:grid-cols-2 md:px-10">
    <article className="flex flex-col gap-3 rounded-tacha-card border-t-4 border-tacha-teal bg-tacha-surface p-6">
      <h2 className="font-display text-2xl font-bold text-tacha-teal">{ABOUT_TEXT.MISSION_TITLE}</h2>
      <p className="font-body text-base text-tacha-text">{ABOUT_TEXT.MISSION}</p>
    </article>
    <article className="flex flex-col gap-3 rounded-tacha-card border-t-4 border-tacha-terracotta bg-tacha-surface p-6">
      <h2 className="font-display text-2xl font-bold text-tacha-terracotta">{ABOUT_TEXT.VISION_TITLE}</h2>
      <p className="font-body text-base text-tacha-text">{ABOUT_TEXT.VISION}</p>
    </article>
  </section>
);
