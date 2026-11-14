"use client";

import Link from "next/link";
import { AUTH_ROUTE } from "@/constants";
import { NAVBAR_TEXT } from "../constants/landing.constants";
import { usePublicNavbarViewModel } from "../hooks/usePublicNavbarViewModel";
import { ButtonLink } from "./ButtonLink";

/**
 * Los botones de la derecha de la navbar pública. Es la única parte cliente de
 * la navbar: necesita la sesión del navegador; el resto sigue siendo de servidor.
 * Sin sesión registrada: "Iniciar sesión" (enlace secundario) y "Registrarse"
 * (botón principal, SCRUM-144). Con sesión: solo "Ir a mi lista".
 */
export const PublicNavbarCta = (): React.JSX.Element => {
  const { ctaHref, ctaLabel, isLoginVisible } = usePublicNavbarViewModel();

  return (
    <div className="flex items-center gap-3">
      {isLoginVisible ? (
        <Link
          href={AUTH_ROUTE.LOGIN}
          className="rounded-tacha-badge border border-tacha-teal px-4 py-2 font-body text-sm font-semibold text-tacha-teal transition-colors hover:bg-tacha-teal/10"
        >
          {NAVBAR_TEXT.LOG_IN}
        </Link>
      ) : null}
      <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>
    </div>
  );
};
