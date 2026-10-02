import Link from "next/link";
import type { ButtonLinkProps } from "./models/ButtonLinkProps.interface";


export const ButtonLink = ({ children, href }: ButtonLinkProps): React.JSX.Element => (
  <Link
    href={href}
    className="inline-block rounded-tacha-badge bg-tacha-teal px-4 py-2 text-center font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
  >
    {children}
  </Link>
);
