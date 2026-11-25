import { describe, expect, it } from "vitest";
import { ASSIGNEE_TEXT } from "../constants/assignee-field.constants";
import type { AssigneeCandidate } from "../models/AssigneeCandidate.interface";
import { toAssigneeName } from "../utils/toAssigneeName";

const CANDIDATES: AssigneeCandidate[] = [
  { displayName: "Ana", isCurrentUser: true, userId: "user-ana" },
  { displayName: null, isCurrentUser: false, userId: "user-beto" },
];

describe("toAssigneeName", () => {
  it("shows the name of the assignee", () => {
    expect(toAssigneeName(CANDIDATES, "user-ana")).toBe("Ana");
  });

  it("shows 'Sin nombre' when the account saved no name", () => {
    expect(toAssigneeName(CANDIDATES, "user-beto")).toBe(ASSIGNEE_TEXT.UNNAMED);
  });

  it("shows 'Sin asignar' when there is no assignee", () => {
    expect(toAssigneeName(CANDIDATES, null)).toBe(ASSIGNEE_TEXT.UNASSIGNED);
  });

  it("shows 'Sin asignar' when the assignee no longer has access to the list", () => {
    expect(toAssigneeName(CANDIDATES, "user-que-salio")).toBe(ASSIGNEE_TEXT.UNASSIGNED);
  });
});
