import { describe, expect, it } from "vitest";
import { LIST_SETTINGS_TEXT } from "../constants/list-settings.constants";
import type { ListRecord } from "../models/ListRecord.interface";
import { toSettableLists } from "../utils/toSettableLists";

const generalRow = (overrides: Partial<ListRecord> = {}): ListRecord => ({
  event_date: null,
  household_id: null,
  id: "list-general",
  list_settings: null,
  name: null,
  type: "general",
  ...overrides,
});

const dateRow = (id: string, name: string, eventDate: string, overrides: Partial<ListRecord> = {}): ListRecord => ({
  event_date: eventDate,
  household_id: null,
  id,
  list_settings: null,
  name,
  type: "date",
  ...overrides,
});

describe("toSettableLists", () => {
  it("counts a list without a settings row as off", () => {
    expect(toSettableLists([generalRow()])).toEqual([
      { id: "list-general", isEnabled: false, label: LIST_SETTINGS_TEXT.GENERAL_LIST },
    ]);
  });

  it("reads the setting of each list on its own", () => {
    const lists = toSettableLists([
      generalRow({ list_settings: { assignee_enabled: true } }),
      dateRow("date-1", "Cumple", "2099-12-20", { list_settings: { assignee_enabled: false } }),
    ]);

    expect(lists.map((list) => list.isEnabled)).toEqual([true, false]);
  });

  it("puts the general list first and the sublists after it, nearest date first", () => {
    const lists = toSettableLists([
      dateRow("date-late", "Viaje", "2099-12-20"),
      generalRow(),
      dateRow("date-soon", "Cumple", "2099-11-02"),
    ]);

    expect(lists.map((list) => list.id)).toEqual(["list-general", "date-soon", "date-late"]);
  });

  it("names a sublist with its name and its date", () => {
    const [, sublist] = toSettableLists([generalRow(), dateRow("date-1", "Cumple", "2099-12-20")]);

    expect(sublist?.label).toBe("Cumple · 20/12/2099");
  });

  it("calls the general list of a family 'Lista general de la familia'", () => {
    const [list] = toSettableLists([generalRow({ household_id: "family-1" })]);

    expect(list?.label).toBe(LIST_SETTINGS_TEXT.GENERAL_LIST_FAMILY);
  });

  it("leaves out the personal list kept when joining a family", () => {
    const lists = toSettableLists([
      generalRow({ household_id: "family-1", id: "list-family" }),
      generalRow({ id: "list-personal" }),
    ]);

    expect(lists.map((list) => list.id)).toEqual(["list-family"]);
  });

  it("keeps the personal list of someone without a family", () => {
    expect(toSettableLists([generalRow()]).map((list) => list.id)).toEqual(["list-general"]);
  });

  it("returns nothing when there are no lists", () => {
    expect(toSettableLists([])).toEqual([]);
  });
});
