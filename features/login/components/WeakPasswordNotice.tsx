import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { CHANGE_PASSWORD_LABEL } from "../constants/login.constants";
import { FocusedHeading } from "./FocusedHeading";
import type { WeakPasswordNoticeProps } from "./models/WeakPasswordNoticeProps.interface";

/** Aviso de contraseña débil. No bloquea: "Ahora no" siempre deja continuar. */
export const WeakPasswordNotice = ({
  onChangePassword,
  onSkip,
}: WeakPasswordNoticeProps): React.JSX.Element => (
  <section role="status" className="flex flex-col gap-4">
    <FocusedHeading>{CHANGE_PASSWORD_LABEL.NOTICE_TITLE}</FocusedHeading>
    <p className="font-body text-sm text-tacha-textsec">{CHANGE_PASSWORD_LABEL.NOTICE_MESSAGE}</p>

    <div className="flex flex-col gap-2">
      <Button onClick={onChangePassword}>{CHANGE_PASSWORD_LABEL.CHANGE}</Button>
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onSkip}>
        {CHANGE_PASSWORD_LABEL.NOT_NOW}
      </Button>
    </div>
  </section>
);
