import type { FormEvent } from "react";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { ProfileSaveStatusType } from "../constants/profile.constants";

export interface ProfileViewModel {
  /** Foto que se ve ahora: la elegida y todavía sin guardar, la guardada, o null (iniciales). */
  avatarUrl: NullableRef<string>;
  handleNameChange: (value: string) => void;
  handlePhotoRemove: () => void;
  handlePhotoSelect: (file: File) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  /** Iniciales del nombre guardado; null sin nombre. */
  initials: NullableRef<string>;
  isSubmitDisabled: boolean;
  /** Todavía no llegó la sesión: la pantalla muestra el esqueleto en vez de un formulario vacío. */
  isLoading: boolean;
  /** Valor del campo: lo escrito o, mientras no se escribe nada, el nombre guardado. */
  name: string;
  /** Solo con algo escrito: abrir la pantalla con el nombre vacío no muestra error. */
  nameError: NullableUndefined<string>;
  /** Nombre guardado, para el encabezado. null sin nombre. */
  savedName: NullableRef<string>;
  /** Se puede quitar: hay una foto guardada o una elegida sin guardar. */
  hasPhoto: boolean;
  photoError: NullableUndefined<string>;
  saveError: NullableUndefined<string>;
  saveStatus: ProfileSaveStatusType;
}
