import Link from "next/link";
import { LANDING_ROUTE, NAV_LINKS, NAVBAR_TEXT } from "../constants/landing.constants";
import { ButtonLink } from "./ButtonLink";
import { Logo } from "./Logo";

export const PublicNavbar = (): React.JSX.Element => (
  <header className="border-b border-tacha-border bg-tacha-bg">
    <nav
      aria-label={NAVBAR_TEXT.NAV_LABEL}
      className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-10"

    >
      <Logo />
      <ul className="flex flex-wrap items-center gap-4 md:gap-6">
        {NAV_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="font-body text-sm font-semibold text-tacha-textsec hover:text-tacha-teal"
            >
              {label}
            </Link>
          </li>
        ))}
        <li>
          <ButtonLink href={LANDING_ROUTE.REGISTER}>{NAVBAR_TEXT.REGISTER}</ButtonLink>
        </li>
      </ul>
    </nav>
  </header>
);
