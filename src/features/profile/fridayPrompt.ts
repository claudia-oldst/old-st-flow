export const FRIDAY_KEY = "pulse:avatar-prompt-dismissed";

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Prompt on Fridays only, for people without a photo, unless already dismissed today. */
export function shouldPromptForAvatar(hasAvatar: boolean, now: Date, dismissedOn: string | null): boolean {
  if (hasAvatar) return false;
  if (now.getDay() !== 5) return false;
  return dismissedOn !== localDateKey(now);
}
