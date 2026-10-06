import { LANDING_SECTION_ID, MORE_INFO_TEXT, PLATFORM_FEATURES } from "../constants/landing.constants";

export const MoreInfoSection = (): React.JSX.Element => (
  <section id={LANDING_SECTION_ID.MORE_INFO} className="px-4 py-16 md:px-10">
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <h2 className="font-display text-3xl font-bold text-tacha-text">{MORE_INFO_TEXT.TITLE}</h2>
      {PLATFORM_FEATURES.map(({ detail, id, title }) => (
        <article key={id} className="flex flex-col gap-2 border-l-4 border-tacha-teal pl-4">
          <h3 className="font-display text-xl font-semibold text-tacha-text">{title}</h3>
          <p className="font-body text-base text-tacha-textsec">{detail}</p>
        </article>
      ))}
      <a
        href={MORE_INFO_TEXT.BACK_TO_TOP_HREF}
        className="font-body text-sm font-semibold text-tacha-teal hover:underline"
      >
        {MORE_INFO_TEXT.BACK_TO_TOP}
      </a>
    </div>
  </section>
);
