import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounced, relativeTime } from "./useProjectsList";

describe("useDebounced", () => {
  it("delays updates until the timeout elapses", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebounced(v, 200), {
      initialProps: { v: "a" },
    });
    expect(result.current).toBe("a");
    rerender({ v: "b" });
    expect(result.current).toBe("a");
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe("a");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
    vi.useRealTimers();
  });
});

describe("relativeTime", () => {
  const RealNow = Date.now;
  afterEach(() => {
    Date.now = RealNow;
  });

  it("returns empty for null", () => {
    expect(relativeTime(null)).toBe("");
  });

  it("returns 'today' for sub-day differences", () => {
    Date.now = () => new Date("2024-06-15T12:00:00Z").getTime();
    expect(relativeTime("2024-06-15T06:00:00Z")).toBe("today");
  });

  it("formats day, week, month, year buckets", () => {
    Date.now = () => new Date("2024-06-15T00:00:00Z").getTime();
    expect(relativeTime("2024-06-12T00:00:00Z")).toBe("3d ago");
    expect(relativeTime("2024-06-01T00:00:00Z")).toBe("2w ago");
    expect(relativeTime("2024-04-01T00:00:00Z")).toBe("2mo ago");
    expect(relativeTime("2022-06-01T00:00:00Z")).toBe("2y ago");
  });
});

import { vi, afterEach } from "vitest";
