import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToListChanges } from "../services/recipe-coverage.service";

// Sin Supabase real: el cliente falso arma un canal cuyo estado de suscripción
// controla el test.
const removeChannelMock = vi.fn();
const channelMock = {
  on: vi.fn(),
  subscribe: vi.fn(),
};
const changeListeners: Array<() => void> = [];
let reportSubscribeStatus: (subscribeStatus: string) => void = () => undefined;

vi.mock("@/services/supabase.client", () => ({
  ensureSession: vi.fn().mockResolvedValue(undefined),
  getSupabaseClient: () => ({
    channel: () => channelMock,
    removeChannel: removeChannelMock,
  }),
}));

beforeEach(() => {
  removeChannelMock.mockReset();
  changeListeners.length = 0;
  channelMock.on.mockReset().mockImplementation((_listenType, _filter, listener: () => void) => {
    changeListeners.push(listener);
    return channelMock;
  });
  channelMock.subscribe.mockReset().mockImplementation((callback: (subscribeStatus: string) => void) => {
    reportSubscribeStatus = callback;
    return channelMock;
  });
});

describe("subscribeToListChanges", () => {
  it("listens to every change of list_items", async () => {
    await subscribeToListChanges(vi.fn());

    expect(channelMock.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "list_items" },
      expect.any(Function),
    );
  });

  it("notifies on each change that arrives", async () => {
    const onChange = vi.fn();
    await subscribeToListChanges(onChange);

    changeListeners[0]();
    changeListeners[0]();

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("notifies once when the subscription becomes active, so a change in between is not lost", async () => {
    const onChange = vi.fn();
    await subscribeToListChanges(onChange);
    expect(onChange).not.toHaveBeenCalled();

    reportSubscribeStatus("SUBSCRIBED");

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it.each(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"])("does nothing when the subscription ends as %s", async (failedStatus) => {
    const onChange = vi.fn();
    await subscribeToListChanges(onChange);

    reportSubscribeStatus(failedStatus);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes the channel when the returned function is called", async () => {
    const unsubscribe = await subscribeToListChanges(vi.fn());

    unsubscribe();

    expect(removeChannelMock).toHaveBeenCalledWith(channelMock);
  });
});
