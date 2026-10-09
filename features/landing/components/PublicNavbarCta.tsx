"use client";

import { usePublicNavbarViewModel } from "../hooks/usePublicNavbarViewModel";
import { ButtonLink } from "./ButtonLink";

/**
 * El botón de la derecha de la navbar pública. Es la única parte cliente de
 * la navbar: necesita la sesión del navegador; el resto sigue siendo de servidor.
 */
export const PublicNavbarCta = (): React.JSX.Element => {
  const { ctaHref, ctaLabel } = usePublicNavbarViewModel();

  return <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>;
};
