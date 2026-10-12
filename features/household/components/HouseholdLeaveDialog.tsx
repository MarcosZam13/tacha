import { Button, Modal, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { HOUSEHOLD_LEAVE_FORM, HOUSEHOLD_LEAVE_TEXT } from "../constants/household.constants";
import type { HouseholdLeaveDialogProps } from "./models/HouseholdLeaveDialogProps.interface";

/**
 * Confirmación antes de salir de la familia. Solo presentación: qué pasa al
 * confirmar, elegir o cancelar lo decide useHouseholdLeave. Clic fuera y
 * Escape llaman a onLeaveCancel (comportamiento del Modal), que no cierra
 * mientras sale.
 *
 * Los radios son nativos dentro de un fieldset con legend: el lector de
 * pantalla anuncia la pregunta y las flechas se mueven entre opciones. El
 * rojo (destructive) va solo en el botón que de verdad saca de la familia.
 */
export const HouseholdLeaveDialog = ({
  description,
  errorMessage,
  isConfirmDisabled,
  isDialogOpen,
  isLeaving,
  isLoadingMembers,
  newAdminOptions,
  onLeaveCancel,
  onLeaveConfirm,
  showConfirm,
  title,
}: HouseholdLeaveDialogProps): React.JSX.Element => (
  <Modal isOpen={isDialogOpen} onClose={onLeaveCancel} title={title}>
    <div className="flex flex-col gap-4">
      {showConfirm ? <p className="font-body text-sm text-tacha-textsec">{description}</p> : null}
      {isLoadingMembers ? <Spinner /> : null}
      {newAdminOptions.length > 0 ? (
        <fieldset disabled={isLeaving} className="flex flex-col gap-2">
          <legend className="mb-2 font-body text-sm font-semibold text-tacha-text">
            {HOUSEHOLD_LEAVE_TEXT.NEW_ADMIN_LEGEND}
          </legend>
          {newAdminOptions.map((option) => (
            <label
              key={option.optionKey}
              className="flex items-center gap-3 rounded-tacha-badge border border-tacha-border px-3 py-2 font-body text-sm text-tacha-text"
            >
              <input
                type="radio"
                name={HOUSEHOLD_LEAVE_FORM.NEW_ADMIN_RADIO_NAME}
                checked={option.isSelected}
                onChange={option.onSelect}
                className="h-4 w-4 accent-tacha-teal"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isLeaving} onClick={onLeaveCancel}>
          {HOUSEHOLD_LEAVE_TEXT.CANCEL}
        </Button>
        {showConfirm ? (
          <Button variant={BUTTON_VARIANT.DESTRUCTIVE} isDisabled={isConfirmDisabled} onClick={onLeaveConfirm}>
            {isLeaving ? HOUSEHOLD_LEAVE_TEXT.LEAVING : HOUSEHOLD_LEAVE_TEXT.CONFIRM}
          </Button>
        ) : null}
      </div>
    </div>
  </Modal>
);
