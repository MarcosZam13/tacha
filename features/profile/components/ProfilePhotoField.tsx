import { useId } from "react";
import { ProfileAvatar } from "@/components/profile-avatar/ProfileAvatar";
import { Button } from "@/components/ui";
import { AVATAR_SIZE, BUTTON_VARIANT } from "@/constants";
import { AVATAR_ACCEPT, PROFILE_TEXT } from "../constants/profile.constants";
import type { ProfilePhotoFieldProps } from "./models/ProfilePhotoFieldProps.interface";

/**
 * Foto de perfil: vista previa, "Cambiar foto" y "Quitar foto". El selector de archivos es un input
 * oculto visualmente (sr-only, sigue en el orden de Tab) y "Cambiar foto" es su etiqueta, así que se abre
 * con teclado o con el clic sin necesitar una referencia al input. Se vuelve a vaciar tras elegir para
 * poder elegir el mismo archivo otra vez.
 */
export const ProfilePhotoField = ({
  avatarUrl,
  handlePhotoRemove,
  handlePhotoSelect,
  hasPhoto,
  initials,
  photoError,
}: ProfilePhotoFieldProps): React.JSX.Element => {
  // useId: único y estable entre servidor y navegador. El mismo patrón que Input.
  const inputId = useId();
  const descriptionId = `${inputId}-descripcion`;

  return (
    <div className="flex flex-col gap-2 font-body text-sm">
      <span className="font-medium text-tacha-text">{PROFILE_TEXT.PHOTO_LABEL}</span>
      <div className="flex items-center gap-4">
        <ProfileAvatar avatarUrl={avatarUrl} initials={initials} size={AVATAR_SIZE.LARGE} />
        <div className="flex flex-wrap items-center gap-3">
          <input
            id={inputId}
            type="file"
            accept={AVATAR_ACCEPT}
            aria-describedby={descriptionId}
            className="peer sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handlePhotoSelect(file);
              event.target.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-tacha-badge border border-tacha-teal px-4 py-2 font-semibold text-tacha-teal hover:bg-tacha-teal/10 peer-focus-visible:ring-2 peer-focus-visible:ring-tacha-teal"
          >
            {PROFILE_TEXT.CHANGE_PHOTO}
          </label>
          {hasPhoto ? (
            <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handlePhotoRemove}>
              {PROFILE_TEXT.REMOVE_PHOTO}
            </Button>
          ) : null}
        </div>
      </div>
      <p id={descriptionId} className={photoError ? "text-red-600" : "text-tacha-textsec"}>
        {photoError ?? PROFILE_TEXT.PHOTO_HELP}
      </p>
    </div>
  );
};
