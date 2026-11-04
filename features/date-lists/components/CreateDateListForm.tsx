import { Button, Input } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { CreateDateListFormViewModel } from "../hooks/useCreateDateListForm";

interface CreateDateListFormProps {
  form: CreateDateListFormViewModel;
}

/** Flujo corto de CA-01: nombre y fecha. Solo dibuja; la lógica está en useCreateDateListForm. */
export const CreateDateListForm = ({ form }: CreateDateListFormProps): React.JSX.Element => (
  <form
    noValidate
    className="flex flex-col gap-4"
    onSubmit={(event) => {
      event.preventDefault();
      void form.onSubmit();
    }}
  >
    <Input
      isRequired
      errorMessage={form.nameError ?? undefined}
      label={DATE_LIST_TEXT.NAME_LABEL}
      onChange={form.onNameChange}
      placeholder={DATE_LIST_TEXT.NAME_PLACEHOLDER}
      value={form.name}
    />
    <Input
      isRequired
      errorMessage={form.dateError ?? undefined}
      label={DATE_LIST_TEXT.DATE_LABEL}
      onChange={form.onEventDateChange}
      type="date"
      value={form.eventDate}
    />
    {form.submitError ? (
      <p role="alert" className="font-body text-sm text-tacha-danger">
        {form.submitError}
      </p>
    ) : null}
    <div className="flex justify-end gap-2">
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={form.onClose}>
        {DATE_LIST_TEXT.FORM_CANCEL}
      </Button>
      <Button isDisabled={form.isSubmitting} type="submit" variant={BUTTON_VARIANT.PRIMARY}>
        {form.isSubmitting ? DATE_LIST_TEXT.CREATE_SUBMITTING : DATE_LIST_TEXT.CREATE_SUBMIT}
      </Button>
    </div>
  </form>
);
