import Link from "next/link";
import { AUTH_ROUTE } from "@/constants";
import { FINANCE_TEXT } from "../constants/finance.constants";

/**
 * Lo que ve quien no tiene una cuenta registrada (SPEC D6): sin sesión o con
 * una sesión anónima. No es un error (no lleva role="alert"): es un aviso con
 * un enlace real al login. La pantalla no pide ningún dato en este estado.
 */
export const FinanceNoAccount = (): React.JSX.Element => (
  <div className="flex flex-col items-start gap-3 rounded-tacha-card border border-dashed border-tacha-border px-4 py-8 font-body text-sm text-tacha-textsec">
    <p>{FINANCE_TEXT.NO_ACCOUNT}</p>
    <Link
      href={AUTH_ROUTE.LOGIN}
      className="rounded-tacha-badge bg-tacha-teal px-4 py-2 font-semibold text-white hover:opacity-90"
    >
      {FINANCE_TEXT.LOGIN}
    </Link>
  </div>
);
