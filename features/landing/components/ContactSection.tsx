"use client";

import { CONTACT_HEADING_ID, CONTACT_LABEL } from "../constants/contact.constants";
import { LANDING_SECTION_ID } from "../constants/landing.constants";
import { useContactFormViewModel } from "../hooks/useContactFormViewModel";
import { ContactForm } from "./ContactForm";
import { ContactSuccess } from "./ContactSuccess";
import type { ContactSectionProps } from "./models/ContactSectionProps.interface";

/** Sección de contacto (HU-06, HU-14): el formulario, o la confirmación después de un envío exitoso. */
export const ContactSection = ({ source }: ContactSectionProps): React.JSX.Element => {
  const { handleSendAnother, isSuccess, ...formProps } = useContactFormViewModel(source);

  return (
    <section
      id={LANDING_SECTION_ID.CONTACT_FORM}
      aria-labelledby={CONTACT_HEADING_ID}
      className="px-4 py-12 md:px-10"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h2
          id={CONTACT_HEADING_ID}
          className="font-display text-3xl font-bold text-tacha-text"
        >
          {CONTACT_LABEL.TITLE}
        </h2>
        {isSuccess ? (
          <ContactSuccess onSendAnother={handleSendAnother} />
        ) : (
          <ContactForm {...formProps} />
        )}
      </div>
    </section>
  );
};
