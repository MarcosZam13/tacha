import { HERO_TEXT, LANDING_ROUTE } from "../constants/landing.constants";
import { ButtonLink } from "./ButtonLink";

export const HeroSection = (): React.JSX.Element => (
  <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center md:py-24">
    <h1 className="font-display text-4xl font-bold leading-tight text-tacha-text md:text-5xl">
      {HERO_TEXT.TITLE}
    </h1>
    <p className="max-w-xl font-body text-base text-tacha-textsec">{HERO_TEXT.DESCRIPTION}</p>
    <div className="mt-4">
      <ButtonLink href={LANDING_ROUTE.REGISTER}>{HERO_TEXT.CTA}</ButtonLink>
    </div>
  </section>
);
