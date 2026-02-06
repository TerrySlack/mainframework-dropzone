import { withDragDefaults } from "../../src/shared/utils/dragAndDrop";

describe("withDragDefaults", () => {
  it("calls the handler with the event", () => {
    const handler = jest.fn();
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.SyntheticEvent;

    const wrapped = withDragDefaults(handler);
    wrapped(mockEvent);

    expect(handler).toHaveBeenCalledWith(mockEvent);
  });

  it("calls preventDefault on the event", () => {
    const handler = jest.fn();
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.SyntheticEvent;

    const wrapped = withDragDefaults(handler);
    wrapped(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("calls stopPropagation on the event", () => {
    const handler = jest.fn();
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.SyntheticEvent;

    const wrapped = withDragDefaults(handler);
    wrapped(mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it("calls preventDefault and stopPropagation before the handler", () => {
    const callOrder: string[] = [];
    const handler = jest.fn(() => callOrder.push("handler"));
    const mockEvent = {
      preventDefault: jest.fn(() => callOrder.push("preventDefault")),
      stopPropagation: jest.fn(() => callOrder.push("stopPropagation")),
    } as unknown as React.SyntheticEvent;

    const wrapped = withDragDefaults(handler);
    wrapped(mockEvent);

    expect(callOrder).toEqual(["preventDefault", "stopPropagation", "handler"]);
  });
});
