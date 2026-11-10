import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { bumpCapacityCaches, capacityFor } from "./useTicketCapacity";

describe("time request unlocks logging immediately", () => {
  it("a +2h request on a 0h ticket makes 2h loggable at once", () => {
    const qc = new QueryClient();
    const row = { actualFE: 0, currentFE: 0, pendingFE: 0, availableFE: 0, actualBE: 0, currentBE: 0, pendingBE: 0, availableBE: 0, actualProj: 0, currentProj: 0, pendingProj: 0, availableProj: 0 };
    qc.setQueryData(["ticket-capacity-by-ids", "t1"], { t1: row });
    bumpCapacityCaches(qc, "t1", "FE", 2);
    const cap = capacityFor((qc.getQueryData(["ticket-capacity-by-ids", "t1"]) as any).t1, "FE");
    expect(cap.available).toBe(2);
    expect(cap.pending).toBe(2);
    expect(cap.actual + 2 > cap.available).toBe(false);
  });
});
