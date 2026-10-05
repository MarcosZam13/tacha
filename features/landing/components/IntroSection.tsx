import { INTRO_TEXT, LANDING_SECTION_ID, PLATFORM_FEATURES } from "../constants/landing.constants";

export const IntroSection = (): React.JSX.Element => (
  <section id={LANDING_SECTION_ID.INTRO} className="bg-tacha-surface px-4 py-16 md:px-10">
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2 text-center">
        <h2 className="font-display text-3xl font-bold text-tacha-text">{INTRO_TEXT.TITLE}</h2>
        <p className="mx-auto max-w-2xl font-body text-base text-tacha-textsec">{INTRO_TEXT.DESCRIPTION}</p>
      </header>
      <ul className="grid gap-4 md:grid-cols-3">
        {PLATFORM_FEATURES.map(({ id, summary, title }) => (
          <li key={id} className="flex flex-col gap-2 rounded-tacha-card border border-tacha-border bg-tacha-bg p-5">
            <h3 className="font-display text-lg font-semibold text-tacha-text">{title}</h3>
            <p className="font-body text-sm text-tacha-textsec">{summary}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
