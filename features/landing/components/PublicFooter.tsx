import { FOOTER_TEXT, LANDING_SECTION_ID, TACHA_INSTAGRAM } from "../constants/landing.constants";

export const PublicFooter = (): React.JSX.Element => (
  <footer
    id={LANDING_SECTION_ID.CONTACT}
    className="grid gap-8 border-t border-tacha-border bg-tacha-surface px-4 py-10 md:grid-cols-3 md:px-10"
  >

    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold text-tacha-text">{FOOTER_TEXT.CONTACT_TITLE}</h2>
      <p className="font-body text-sm text-tacha-textsec">{FOOTER_TEXT.CONTACT_DESCRIPTION}</p>
      <a
        href={TACHA_INSTAGRAM.URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-body text-sm font-semibold text-tacha-teal hover:underline"
      >
        {TACHA_INSTAGRAM.HANDLE}
      </a>
    </section>
     <p className="font-body text-sm text-tacha-textsec">{FOOTER_TEXT.DESCRIPTION}</p>
  </footer>
);
