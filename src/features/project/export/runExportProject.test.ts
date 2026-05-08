import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => import("@/test/mocks/supabase"));
vi.mock("xlsx", () => {
  const writeFile = vi.fn();
  const utils = {
    book_new: vi.fn(() => ({ SheetNames: [] as string[], Sheets: {} as Record<string, unknown> })),
    aoa_to_sheet: vi.fn((rows: unknown[][]) => ({ rows })),
    book_append_sheet: vi.fn((wb: { SheetNames: string[] }, _ws: unknown, name: string) => {
      wb.SheetNames.push(name);
    }),
  };
  return { writeFile, utils };
});

import { setSupabaseHandler, resetSupabaseHandler } from "@/test/mocks/supabase";
import * as XLSX from "xlsx";
import { runExportProject } from "./runExportProject";
import type { Project } from "@/lib/types";

const project = { id: "p-1", acronym: "OLD" } as unknown as Project;

describe("runExportProject", () => {
  beforeEach(() => {
    resetSupabaseHandler();
    vi.clearAllMocks();
  });

  it("returns an error when no tabs are selected", async () => {
    setSupabaseHandler(() => ({ data: [], error: null }));
    const out = await runExportProject({
      project,
      asOf: new Date("2024-06-15"),
      includeTickets: false,
      includeChanges: false,
      includeLogs: false,
    });
    expect(out).toEqual({ ok: false, error: "Select at least one tab to export" });
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });

  it("propagates supabase errors", async () => {
    setSupabaseHandler(({ table }) =>
      table === "tickets"
        ? { data: null, error: { message: "boom" } }
        : { data: [], error: null },
    );
    const out = await runExportProject({
      project,
      asOf: new Date("2024-06-15"),
      includeTickets: true,
      includeChanges: true,
      includeLogs: true,
    });
    expect(out).toEqual({ ok: false, error: "boom" });
  });

  it("builds tickets, changes, and logs sheets and writes the workbook", async () => {
    setSupabaseHandler(({ table }) => {
      if (table === "tickets") {
        return {
          data: [
            {
              id: "t-1",
              formatted_id: "OLD-1",
              title: "Demo",
              ticket_type: "Standard",
              fe_status: "todo",
              be_status: "todo",
              original_fe_estimate: 4,
              original_be_estimate: 6,
              original_project_estimate: 0,
              current_project_estimate: 0,
              created_at: "2024-01-01T00:00:00Z",
              epic: { epic_name: "Epic A" },
              assignees: [{ slot: "FE", member: { name: "Alice" } }],
            },
          ],
          error: null,
        };
      }
      if (table === "ticket_estimate_changes") {
        return {
          data: [
            {
              id: "c-1",
              ticket_id: "t-1",
              discipline: "FE",
              previous_hours: 4,
              new_hours: 6,
              delta: 2,
              status: "approved",
              reason: "scope creep",
              created_at: "2024-02-01T00:00:00Z",
              user: { name: "Alice" },
              ticket: {
                formatted_id: "OLD-1",
                title: "Demo",
                ticket_type: "Standard",
                project_id: "p-1",
                epic: { epic_name: "Epic A" },
              },
            },
          ],
          error: null,
        };
      }
      if (table === "time_logs") {
        return {
          data: [
            {
              id: "l-1",
              ticket_id: "t-1",
              hours: 2,
              discipline: "FE",
              note: "did stuff",
              source: "manual",
              logged_at: "2024-03-01T00:00:00Z",
              user: { name: "Alice" },
              ticket: {
                formatted_id: "OLD-1",
                title: "Demo",
                ticket_type: "Standard",
                project_id: "p-1",
                epic: { epic_name: "Epic A" },
              },
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const out = await runExportProject({
      project,
      asOf: new Date("2024-06-15"),
      includeTickets: true,
      includeChanges: true,
      includeLogs: true,
    });

    expect(out).toEqual({ ok: true, filename: "OLD-export-2024-06-15.xlsx" });
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(3);
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);

    // Confirm tickets row had the approved FE delta applied (4 + 2 = 6)
    const ticketsSheetCall = (XLSX.utils.aoa_to_sheet as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const ticketsRows = ticketsSheetCall[0] as unknown[][];
    const dataRow = ticketsRows[1] as unknown[];
    // Updated FE Estimate is index 7 (after header 0-indexed: id,type,name,epic,feOrig,beOrig,projOrig,UpdatedFE,...)
    expect(dataRow[7]).toBe(6);
  });
});
