import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { SIGN_OUT_TEXT } from "./constants/sign-out.constants";
import { useSignOutViewModel } from "./hooks/useSignOutViewModel";

/**
 * Botón de cerrar sesión (SCRUM-55), compartido por el sidebar y la pantalla de Perfil. Sin cambios sin
 * guardar cierra de inmediato; con ellos abre una confirmación. La lógica vive en el ViewModel.
 */
export const SignOutButton = (): React.JSX.Element => {
  const { handleCancel, handleConfirm, handleRequest, isConfirmOpen, isSigningOut } =
    useSignOutViewModel();

  return (
    <>
      <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSigningOut} onClick={handleRequest}>
        {isSigningOut ? SIGN_OUT_TEXT.SIGNING_OUT : SIGN_OUT_TEXT.TRIGGER}
      </Button>
      <Modal isOpen={isConfirmOpen} onClose={handleCancel} title={SIGN_OUT_TEXT.CONFIRM_TITLE}>
        <p className="mb-4 font-body text-sm text-tacha-textsec">{SIGN_OUT_TEXT.CONFIRM_BODY}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handleCancel}>
            {SIGN_OUT_TEXT.CANCEL}
          </Button>
          <Button variant={BUTTON_VARIANT.DESTRUCTIVE} onClick={handleConfirm}>
            {SIGN_OUT_TEXT.CONFIRM}
          </Button>
        </div>
      </Modal>
    </>
  );
};
