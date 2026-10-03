"use client";

import { useFocusHeadingOnMount } from "../hooks/useFocusHeadingOnMount";
import type { FocusedHeadingProps } from "./models/FocusedHeadingProps.interface";

/** Título que recibe el foco al aparecer; `tabIndex={-1}` lo hace enfocable sin entrar en el orden de Tab. */
export const FocusedHeading = ({ children }: FocusedHeadingProps): React.JSX.Element => {
  const headingRef = useFocusHeadingOnMount();

  return (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className="font-display text-3xl font-bold text-tacha-text outline-none"
    >
      {children}
    </h1>
  );
};
