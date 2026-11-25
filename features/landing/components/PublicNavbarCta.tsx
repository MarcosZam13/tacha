"use client";

import { AUTH_ROUTE, BUTTON_VARIANT } from "@/constants";
import { NAVBAR_TEXT } from "../constants/landing.constants";
import { usePublicNavbarViewModel } from "../hooks/usePublicNavbarViewModel";
import { ButtonLink } from "./ButtonLink";

/**
 * Los botones de la derecha de la navbar pública. Es la única parte cliente de
 * la navbar: necesita la sesión del navegador; el resto sigue siendo de servidor.
 */
export const PublicNavbarCta = (): React.JSX.Element => {
  const { ctaHref, ctaLabel, isLoginVisible } = usePublicNavbarViewModel();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isLoginVisible ? (
        <ButtonLink href={AUTH_ROUTE.LOGIN} variant={BUTTON_VARIANT.SECONDARY}>
          {NAVBAR_TEXT.LOGIN}
        </ButtonLink>
      ) : null}
      <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>
    </div>
  );
};
