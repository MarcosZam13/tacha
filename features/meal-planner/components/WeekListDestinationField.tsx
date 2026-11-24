import { WEEK_LIST_DESTINATION, WEEK_LIST_FORM, WEEK_LIST_TEXT } from "../constants/meal-planner.constants";
import type { WeekListDestinationFieldProps } from "./models/WeekListDestinationFieldProps.type";

/**
 * "¿A qué lista?": la general o una sublista por fecha. No dibuja nada sin
 * sublistas que ofrecer (SPEC regla 42). Solo presentación.
 */
export const WeekListDestinationField = ({
  dateListOptions,
  destination,
  isAdding,
  onDestinationChange,
}: WeekListDestinationFieldProps): React.JSX.Element | null => {
  if (dateListOptions.length === 0) return null;

  const selectedListId = destination.kind === WEEK_LIST_DESTINATION.DATE_LIST ? destination.id : null;

  return (
    <fieldset disabled={isAdding} className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 font-body text-sm font-semibold text-tacha-text">
        {WEEK_LIST_TEXT.DESTINATION_LABEL}
      </legend>
      <div className="flex max-h-56 flex-col gap-2 overflow-y-auto font-body text-sm text-tacha-text">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={WEEK_LIST_FORM.DESTINATION_FIELD_NAME}
            value={WEEK_LIST_DESTINATION.GENERAL}
            checked={selectedListId === null}
            onChange={() => onDestinationChange({ kind: WEEK_LIST_DESTINATION.GENERAL })}
          />
          {WEEK_LIST_TEXT.DESTINATION_GENERAL}
        </label>
        {dateListOptions.map(({ id, label, name }) => (
          <label key={id} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={WEEK_LIST_FORM.DESTINATION_FIELD_NAME}
              value={id}
              checked={selectedListId === id}
              onChange={() => onDestinationChange({ id, kind: WEEK_LIST_DESTINATION.DATE_LIST, name })}
              className="shrink-0"
            />
            <span className="min-w-0 break-words">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
