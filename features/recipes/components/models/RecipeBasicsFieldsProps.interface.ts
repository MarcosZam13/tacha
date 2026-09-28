import type { NullableUndefined } from "@/types/nullable.types";

export interface RecipeBasicsFieldsProps {
  baseServings: string;
  baseServingsError: NullableUndefined<string>;
  name: string;
  nameError: NullableUndefined<string>;
  onBaseServingsChange: (baseServings: string) => void;
  onNameChange: (name: string) => void;
}
