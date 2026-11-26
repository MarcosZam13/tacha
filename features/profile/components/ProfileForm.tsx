import { Button, Input } from "@/components/ui";
import { PROFILE_SAVE_STATUS, PROFILE_TEXT } from "../constants/profile.constants";
import { ProfilePhotoField } from "./ProfilePhotoField";
import { ProfileSaveFeedback } from "./ProfileSaveFeedback";
import type { ProfileFormProps } from "./models/ProfileFormProps.interface";

/** Formulario de edición: nombre, foto y guardar. Solo presentación; la lógica vive en el ViewModel. */
export const ProfileForm = ({
  handleNameChange,
  handleSubmit,
  isSubmitDisabled,
  name,
  nameError,
  saveError,
  saveStatus,
  ...photoField
}: ProfileFormProps): React.JSX.Element => (
  <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
    <Input
      label={PROFILE_TEXT.NAME_LABEL}
      value={name}
      onChange={handleNameChange}
      errorMessage={nameError}
      isRequired
    />
    <ProfilePhotoField {...photoField} />
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" isDisabled={isSubmitDisabled}>
        {saveStatus === PROFILE_SAVE_STATUS.SAVING ? PROFILE_TEXT.SAVING : PROFILE_TEXT.SAVE}
      </Button>
      <ProfileSaveFeedback saveError={saveError} saveStatus={saveStatus} />
    </div>
  </form>
);
