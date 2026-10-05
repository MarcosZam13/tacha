import Link from "next/link";
import { FOOTER_LINKS, FOOTER_TEXT, LANDING_SECTION_ID, TACHA_INSTAGRAM } from "../constants/landing.constants";
import { Logo } from "./Logo";
import { SocialLinks } from "./SocialLinks";

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

    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-tacha-text">{FOOTER_TEXT.SOCIAL_TITLE}</h2>
      <SocialLinks />
    </section>

    <section aria-label={FOOTER_TEXT.ABOUT_LABEL} className="flex flex-col gap-3">
      <Logo />
      <p className="font-body text-sm text-tacha-textsec">{FOOTER_TEXT.DESCRIPTION}</p>
    </section>

    <nav aria-label={FOOTER_TEXT.LEGAL_LABEL} className="border-t border-tacha-border pt-6 md:col-span-3">
      <ul className="flex flex-wrap gap-4">
        {FOOTER_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="font-body text-sm text-tacha-textsec hover:text-tacha-teal">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </footer>
);
