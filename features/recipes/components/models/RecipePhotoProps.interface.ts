import type { ReactNode } from "react";
import type { NullableRef } from "@/types/nullable.types";

export interface RecipePhotoProps {
  alt: string;
  /** Lo que se ve sin foto o si no carga. */
  fallback: ReactNode;
  url: NullableRef<string>;
}
