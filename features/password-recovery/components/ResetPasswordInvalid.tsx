import { FocusedHeading } from "@/components/focused-heading/FocusedHeading";
import Link from "next/link";
import { AUTH_ROUTE } from "@/constants";
import { RESET_PASSWORD_LABEL } from "../constants/password-recovery.constants";

/**
 * El enlace venció, ya se usó o no existe: la pantalla no distingue cuál, porque la persona hace lo mismo
 * en los tres casos (pedir otro). "Pedir un enlace nuevo" es un enlace (cambia de página) con aspecto de botón.
 */
export const ResetPasswordInvalid = (): React.JSX.Element => (
  <section className="flex flex-col gap-4">
    <FocusedHeading>{RESET_PASSWORD_LABEL.INVALID_TITLE}</FocusedHeading>
    <p role="status" className="font-body text-sm text-tacha-textsec">
      {RESET_PASSWORD_LABEL.INVALID_MESSAGE}
    </p>

    <Link
      href={AUTH_ROUTE.FORGOT_PASSWORD}
      className="rounded-tacha-badge bg-tacha-teal px-4 py-2 text-center font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      {RESET_PASSWORD_LABEL.REQUEST_NEW_LINK}
    </Link>
  </section>
);
