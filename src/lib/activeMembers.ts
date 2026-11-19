/** Inactive (archived) team members must not be offered in pickers. History displays keep them. */
export const isActiveMember = (m: { is_active?: boolean | null } | null | undefined) => !!m && m.is_active !== false;
/** Keep project-member rows whose joined member is still active. */
export const activeRows = <T extends { member?: { is_active?: boolean | null } | null }>(rows: T[] | null | undefined): T[] =>
  (rows ?? []).filter((r) => isActiveMember(r.member));
