import { LIST_SETTINGS_TEXT } from "../constants/list-settings.constants";
import { AssigneeSwitch } from "./AssigneeSwitch";
import type { ListSettingsRowProps } from "./models/ListSettingsRowProps.interface";

/** Una lista de Configuración: su nombre y el interruptor "Encargado"; el error del guardado, junto a ella. */
export const ListSettingsRow = ({ errorMessage, isSaving, list, onToggle }: ListSettingsRowProps): React.JSX.Element => (
  <li className="flex flex-col gap-1 px-4 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="min-w-0 break-words font-body text-sm font-semibold text-tacha-text">{list.label}</span>
      <AssigneeSwitch
        isChecked={list.isEnabled}
        isDisabled={isSaving}
        label={`${LIST_SETTINGS_TEXT.ASSIGNEE_TITLE}, ${list.label}`}
        onToggle={onToggle}
      />
    </div>
    {isSaving ? <p className="font-body text-xs text-tacha-textsec">{LIST_SETTINGS_TEXT.SWITCH_SAVING}</p> : null}
    {errorMessage ? (
      <p role="alert" className="font-body text-xs text-tacha-danger">
        {errorMessage}
      </p>
    ) : null}
  </li>
);
