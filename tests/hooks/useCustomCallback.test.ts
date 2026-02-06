import { renderHook, act } from "@testing-library/react";
import { useCustomCallback } from "../../src/shared/hooks/useCustomCallback";

describe("useCustomCallback", () => {
  it("returns a stable callback reference across renders", () => {
    const callback = jest.fn((x: number) => x + 1);
    const { result, rerender } = renderHook(() => useCustomCallback(callback, [1, 2]));

    const firstCallback = result.current;
    rerender();
    const secondCallback = result.current;

    expect(firstCallback).toBe(secondCallback);
  });

  it("calls the latest callback when dependencies change", () => {
    const callback1 = jest.fn(() => "first");
    const callback2 = jest.fn(() => "second");
    const { result, rerender } = renderHook(({ cb, deps }) => useCustomCallback(cb, deps), {
      initialProps: { cb: callback1, deps: [1] },
    });

    act(() => {
      result.current();
    });
    expect(callback1).toHaveBeenCalledTimes(1);

    rerender({ cb: callback2, deps: [2] });
    act(() => {
      result.current();
    });
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledTimes(1);
  });

  it("passes arguments through to the callback", () => {
    const callback = jest.fn((a: number, b: string) => `${a}-${b}`);
    const { result } = renderHook(() => useCustomCallback(callback, []));

    act(() => {
      result.current(42, "test");
    });
    expect(callback).toHaveBeenCalledWith(42, "test");
    expect(callback).toHaveReturnedWith("42-test");
  });

  it("keeps same callback when dependencies are equal (deep)", () => {
    const callback = jest.fn();
    const deps = [{ a: 1 }, { b: 2 }];
    const { result, rerender } = renderHook(() => useCustomCallback(callback, deps));

    const firstCallback = result.current;
    rerender();
    const secondCallback = result.current;

    expect(firstCallback).toBe(secondCallback);
  });
});
