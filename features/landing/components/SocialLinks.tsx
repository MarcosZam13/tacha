import { TACHA_INSTAGRAM } from "../constants/landing.constants";

export const SocialLinks = (): React.JSX.Element => (
  <ul className="flex gap-3">
    <li>
      <a
        href={TACHA_INSTAGRAM.URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={TACHA_INSTAGRAM.LINK_LABEL}
        className="flex size-10 items-center justify-center rounded-full bg-tacha-chipbg text-tacha-teal hover:opacity-80"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-5"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <path d="M17.5 6.5h.01" />
        </svg>
      </a>
    </li>
  </ul>
);
