/** Returns ids with `from` moved to the position of `to`. */
export function moveEpic(ids: number[], from: number, to: number): number[] {
  if (from === to) return ids;
  const out = ids.filter((id) => id !== from);
  const fromIdx = ids.indexOf(from);
  const toIdx = out.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return ids;
  out.splice(fromIdx < ids.indexOf(to) ? toIdx + 1 : toIdx, 0, from);
  return out;
}
