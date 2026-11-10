/** Which ticket types can be linked as parent/child. Mirrors the DB trigger enforce_bug_parent. */
export type LinkType = "Standard" | "Bug" | "CR" | "Proj" | "Feedback";

export const LINKABLE: LinkType[] = ["Standard", "Bug", "CR", "Feedback"];

export function canLink(childType: string, parentType: string): boolean {
  if (childType === "Proj" || parentType === "Proj") return false;
  if (childType === "Feedback" || parentType === "Feedback") return true;
  return parentType === "Standard" || parentType === "CR";
}

/** Types offered in the parent picker for a ticket of `childType`. */
export function parentTypesFor(childType: string): LinkType[] {
  return LINKABLE.filter((p) => canLink(childType, p));
}

/** Types offered in the "Add child" picker for a ticket of `parentType`. */
export function childTypesFor(parentType: string): LinkType[] {
  if (parentType === "Feedback") return LINKABLE;
  if (parentType === "Standard" || parentType === "CR") return ["Feedback"];
  return [];
}
