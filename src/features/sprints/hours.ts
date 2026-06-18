/** Display helper — rounds hours to 1 decimal and appends "h". */
export function formatHours(h: number): string {
  const rounded = Math.round(h * 10) / 10;
  return `${rounded}h`;
}
