/** Roadmap grouping options; grouping itself is done by the shared tickets table. */
export type GroupBy = "none" | "epic" | "type" | "status" | "assignee";
export const GROUP_LABEL: Record<GroupBy, string> = { none: "None", epic: "Epic", type: "Type", status: "Status", assignee: "Assignee" };
