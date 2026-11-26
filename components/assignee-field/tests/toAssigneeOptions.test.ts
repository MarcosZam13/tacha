import { describe, expect, it } from "vitest";
import { ASSIGNEE_TEXT } from "../constants/assignee-field.constants";
import { toAssigneeOptions } from "../utils/toAssigneeOptions";

describe("toAssigneeOptions", () => {
  it("starts with 'Sin asignar' even when nobody can be chosen", () => {
    expect(toAssigneeOptions([])).toEqual([{ assigneeId: null, label: ASSIGNEE_TEXT.UNASSIGNED }]);
  });

  it("adds one option per person and marks the current user", () => {
    const options = toAssigneeOptions([
      { displayName: "Ana", isCurrentUser: true, userId: "user-ana" },
      { displayName: "Beto", isCurrentUser: false, userId: "user-beto" },
    ]);

    expect(options.map((option) => option.label)).toEqual([ASSIGNEE_TEXT.UNASSIGNED, "Ana (tú)", "Beto"]);
    expect(options.map((option) => option.assigneeId)).toEqual([null, "user-ana", "user-beto"]);
  });

  it("names an account without a name 'Sin nombre'", () => {
    const [, option] = toAssigneeOptions([{ displayName: null, isCurrentUser: false, userId: "user-beto" }]);

    expect(option?.label).toBe(ASSIGNEE_TEXT.UNNAMED);
  });
});
