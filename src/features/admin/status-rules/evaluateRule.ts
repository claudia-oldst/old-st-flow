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
