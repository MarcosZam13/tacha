"use client";

import { ProfileAvatar } from "@/components/profile-avatar/ProfileAvatar";
import { SignOutButton } from "@/components/sign-out-button/SignOutButton";
import { Spinner } from "@/components/ui";
import { AVATAR_SIZE } from "@/constants";
import { ProfileForm } from "./components/ProfileForm";
import { PROFILE_TEXT } from "./constants/profile.constants";
import { useProfileViewModel } from "./hooks/useProfileViewModel";

/**
 * Pantalla de perfil (SCRUM-53). Va dentro del shell de las rutas privadas, que ya trae el <main>.
 * "use client" porque usa hooks y habla con Supabase desde el navegador.
 */
export const Profile = (): React.JSX.Element => {
  const { isLoading, savedName, ...formViewModel } = useProfileViewModel();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-8">
      <header className="flex items-center gap-4">
        <ProfileAvatar
          avatarUrl={formViewModel.avatarUrl}
          initials={formViewModel.initials}
          size={AVATAR_SIZE.LARGE}
        />
        <div>
          <h1 className="font-display text-3xl font-bold text-tacha-text">{PROFILE_TEXT.TITLE}</h1>
          <p className="font-body text-sm text-tacha-textsec">{savedName ?? PROFILE_TEXT.UNNAMED}</p>
        </div>
      </header>
      {isLoading ? <Spinner /> : <ProfileForm {...formViewModel} />}
      {/* Cerrar sesión (SCRUM-55), al final y siempre a la vista: en mobile es el lugar del criterio ("Más → Perfil"). */}
      <div>
        <SignOutButton />
      </div>
    </div>
  );
};
