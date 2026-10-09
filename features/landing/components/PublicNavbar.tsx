import Link from "next/link";
import { NAV_LINKS, NAVBAR_TEXT } from "../constants/landing.constants";
import { Logo } from "./Logo";
import { PublicNavbarCta } from "./PublicNavbarCta";

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
          <PublicNavbarCta />
        </li>
      </ul>
    </nav>
  </header>
);
