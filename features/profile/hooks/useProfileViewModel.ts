import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import { toInitials } from "@/utils/toInitials";
import {
  PROFILE_PHOTO_CHANGE,
  PROFILE_SAVE_STATUS,
  SAVE_PROFILE_RESULT,
  SAVE_PROFILE_RESULT_MESSAGE,
} from "../constants/profile.constants";
import type { ProfileSaveStatusType } from "../constants/profile.constants";
import type { ProfileViewModel } from "../models/ProfileViewModel.interface";
import type { ProfilePhotoChange } from "../models/SaveProfilePayload.interface";
import { saveProfile } from "../services/profile.service";
import { validateAvatarFile } from "../utils/validateAvatarFile";
import { validateProfileName } from "../utils/validateProfileName";

// La foto elegida o quitada y todavía sin guardar. `previewUrl` existe solo con un archivo elegido.
interface PendingPhoto {
  change: ProfilePhotoChange;
  previewUrl: NullableRef<string>;
}

const NO_PENDING_PHOTO: PendingPhoto = { change: { kind: PROFILE_PHOTO_CHANGE.KEEP }, previewUrl: null };

export const useProfileViewModel = (): ProfileViewModel => {
  const profile = useUserProfile();
  // `undefined` hasta que la persona escribe: mientras tanto el campo muestra el nombre guardado. Así no
  // hace falta un efecto que copie el perfil al formulario (y se desincronice si el perfil cambia).
  const [draftName, setDraftName] = useState<NullableUndefined<string>>(undefined);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto>(NO_PENDING_PHOTO);
  const [photoError, setPhotoError] = useState<NullableUndefined<string>>(undefined);
  const [saveStatus, setSaveStatus] = useState<ProfileSaveStatusType>(PROFILE_SAVE_STATUS.IDLE);
  const [saveError, setSaveError] = useState<NullableUndefined<string>>(undefined);

  // Libera la vista previa anterior cuando cambia la foto elegida y al salir de la pantalla.
  useEffect(
    () => () => {
      if (pendingPhoto.previewUrl) URL.revokeObjectURL(pendingPhoto.previewUrl);
    },
    [pendingPhoto.previewUrl],
  );

  const savedName = profile?.name ?? null;
  const savedAvatarUrl = profile?.avatarUrl ?? null;
  const name = draftName ?? savedName ?? "";
  const isSaving = saveStatus === PROFILE_SAVE_STATUS.SAVING;

  // Se calculan en cada render (no son estado): cambian solos al escribir o al elegir la foto.
  const validationError = validateProfileName(name);
  const nameError = draftName === undefined ? undefined : validationError;
  const hasChanges =
    (draftName !== undefined && draftName.trim() !== (savedName ?? "")) ||
    pendingPhoto.change.kind !== PROFILE_PHOTO_CHANGE.KEEP;

  const avatarUrl =
    pendingPhoto.change.kind === PROFILE_PHOTO_CHANGE.KEEP ? savedAvatarUrl : pendingPhoto.previewUrl;

  // Cualquier edición descarta el "guardado" o el fallo del intento anterior; no toca `saving`.
  const clearSaveFeedback = (): void => {
    setSaveStatus((previous) => (previous === PROFILE_SAVE_STATUS.SAVING ? previous : PROFILE_SAVE_STATUS.IDLE));
    setSaveError(undefined);
  };

  const handleNameChange = (value: string): void => {
    setDraftName(value);
    clearSaveFeedback();
  };

  const handlePhotoSelect = (file: File): void => {
    const fileError = validateAvatarFile(file);
    setPhotoError(fileError);
    clearSaveFeedback();
    if (fileError) return;

    setPendingPhoto({
      change: { kind: PROFILE_PHOTO_CHANGE.REPLACE, file },
      previewUrl: URL.createObjectURL(file),
    });
  };

  const handlePhotoRemove = (): void => {
    setPhotoError(undefined);
    clearSaveFeedback();
    // Con una foto elegida y sin guardar, "Quitar" la descarta y vuelve a la guardada; sin ella, marca la
    // guardada para quitarla al guardar.
    setPendingPhoto(
      savedAvatarUrl && pendingPhoto.change.kind === PROFILE_PHOTO_CHANGE.KEEP
        ? { change: { kind: PROFILE_PHOTO_CHANGE.REMOVE }, previewUrl: null }
        : NO_PENDING_PHOTO,
    );
  };

  const save = async (): Promise<void> => {
    setSaveStatus(PROFILE_SAVE_STATUS.SAVING);
    setSaveError(undefined);

    // El servicio no lanza: devuelve el resultado y acá se decide qué mostrar.
    const result = await saveProfile({ name, photo: pendingPhoto.change });

    if (result === SAVE_PROFILE_RESULT.SUCCESS) {
      setDraftName(undefined);
      setPendingPhoto(NO_PENDING_PHOTO);
      setSaveStatus(PROFILE_SAVE_STATUS.SAVED);
      return;
    }

    setSaveError(SAVE_PROFILE_RESULT_MESSAGE[result]);
    setSaveStatus(PROFILE_SAVE_STATUS.ERROR);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    return validationError === undefined && hasChanges && !isSaving ? await save() : undefined;
  };

  return {
    avatarUrl,
    handleNameChange,
    handlePhotoRemove,
    handlePhotoSelect,
    handleSubmit,
    hasPhoto: avatarUrl !== null,
    initials: toInitials(savedName),
    isLoading: profile === null,
    isSubmitDisabled: validationError !== undefined || !hasChanges || isSaving,
    name,
    nameError,
    photoError,
    saveError,
    saveStatus,
    savedName,
  };
};
