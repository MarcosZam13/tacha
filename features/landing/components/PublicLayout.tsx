import type { PublicLayoutProps } from "./models/PublicLayoutProps.interface";
import { PublicFooter } from "./PublicFooter";
import { PublicNavbar } from "./PublicNavbar";

/** Esqueleto de toda página pública: la misma navbar y el mismo footer. */
export const PublicLayout = ({ children }: PublicLayoutProps): React.JSX.Element => (
  <div className="flex min-h-screen flex-col">
    <PublicNavbar />
    <main className="flex-1">{children}</main>
    <PublicFooter />
  </div>
);
