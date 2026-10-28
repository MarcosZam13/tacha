import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { CONTACT_LABEL } from "../constants/contact.constants";
import type { ContactSuccessProps } from "./models/ContactSuccessProps.interface";

/** Confirmación después de un envío exitoso (CA-07). */
export const ContactSuccess = ({ onSendAnother }: ContactSuccessProps): React.JSX.Element => (
  <div className="flex flex-col items-start gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-5">
    <p role="status" className="font-body text-base text-tacha-text">
      {CONTACT_LABEL.SUCCESS}
    </p>
    <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onSendAnother}>
      {CONTACT_LABEL.SEND_ANOTHER}
    </Button>
  </div>
);
