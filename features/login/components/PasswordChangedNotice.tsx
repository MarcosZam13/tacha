import { Button } from "@/components/ui";
import { CHANGE_PASSWORD_LABEL } from "../constants/login.constants";
import { FocusedHeading } from "./FocusedHeading";
import type { PasswordChangedNoticeProps } from "./models/PasswordChangedNoticeProps.interface";

export const PasswordChangedNotice = ({
  onContinue,
}: PasswordChangedNoticeProps): React.JSX.Element => (
  <section className="flex flex-col gap-4">
    <FocusedHeading>{CHANGE_PASSWORD_LABEL.DONE_TITLE}</FocusedHeading>
    <p role="status" className="font-body text-sm text-tacha-textsec">
      {CHANGE_PASSWORD_LABEL.DONE_MESSAGE}
    </p>

    <Button onClick={onContinue}>{CHANGE_PASSWORD_LABEL.CONTINUE}</Button>
  </section>
);
