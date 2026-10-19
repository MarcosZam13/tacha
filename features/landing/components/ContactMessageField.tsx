import { CONTACT_LIMIT, CONTACT_TEXTAREA } from "../constants/contact.constants";
import type { ContactMessageFieldProps } from "./models/ContactMessageFieldProps.interface";

/** Textarea con el mismo aspecto que Input: label, contador de caracteres y error. */
export const ContactMessageField = ({
  errorMessage,
  label,
  onChange,
  value,
}: ContactMessageFieldProps): React.JSX.Element => {
  const borderClassName = errorMessage
    ? "border-red-500 focus:ring-red-500"
    : "border-tacha-border focus:ring-tacha-teal";

  return (
    <label className="flex flex-col gap-1 font-body text-sm">
      <span className="font-medium text-tacha-text">
        {label}
        <span className="text-tacha-terracotta"> *</span>
      </span>
      <textarea
        required
        rows={CONTACT_TEXTAREA.ROWS}
        maxLength={CONTACT_LIMIT.MESSAGE_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`resize-y rounded-tacha-badge border bg-tacha-surface px-3 py-2 text-tacha-text outline-none focus:ring-2 ${borderClassName}`}
      />
      <span className="self-end text-tacha-textsec">
        {value.length} / {CONTACT_LIMIT.MESSAGE_MAX_LENGTH}
      </span>
      {errorMessage ? <span className="text-red-600">{errorMessage}</span> : null}
    </label>
  );
};
