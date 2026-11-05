import type { DisciplineStatus } from "@/lib/types";

export type Operator = "AND" | "OR";

export interface RuleCondition {
  fe_statuses: DisciplineStatus[];
  be_statuses: DisciplineStatus[];
  operator: Operator;
}

/**
 * Evaluate a single status-derivation rule.
 * Empty fe_statuses or be_statuses arrays act as a wildcard ("any").
 */
export function evaluateRule(
  rule: RuleCondition,
  fe: DisciplineStatus,
  be: DisciplineStatus,
): boolean {
  const feMatch = rule.fe_statuses.length === 0 || rule.fe_statuses.includes(fe);
  const beMatch = rule.be_statuses.length === 0 || rule.be_statuses.includes(be);
  return rule.operator === "AND" ? feMatch && beMatch : feMatch || beMatch;
}

/** First-match-wins evaluation of an ordered rule list. */
export function findWinningRule<R extends RuleCondition>(
  rules: R[],
  fe: DisciplineStatus,
  be: DisciplineStatus,
): R | null {
  return rules.find((r) => evaluateRule(r, fe, be)) ?? null;
}

export interface DeriveInput {
  isNew: boolean;
  fe: DisciplineStatus | null;
  be: DisciplineStatus | null;
  override: boolean;
  hasLogs: boolean;
}

/**
 * Mirrors derive_project_status: a brand-new ticket with no FE/BE dev status,
 * no time logged and no manual override goes to BACKLOG. Otherwise a blank
 * side counts as 'todo' and the rules decide. Returns null to keep the status.
 */
export function deriveStatusId<R extends RuleCondition & { status_id: string }>(
  rules: R[],
  input: DeriveInput,
  backlogId: string,
): string | null {
  if (input.override) return null;
  if (input.isNew && input.fe == null && input.be == null && !input.hasLogs) return backlogId;
  return findWinningRule(rules, input.fe ?? "todo", input.be ?? "todo")?.status_id ?? null;
}
