import { supabase } from "@/integrations/supabase/client";
import { GithubLinkDialog } from "@/features/auth/GithubLinkDialog";

const GITHUB_REPO_URL_RE =
  /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;

export function parseGithubRepoUrl(
  value: string,
): { owner: string; repo: string } | null {
  const m = value.match(GITHUB_REPO_URL_RE);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

interface Props {
  open: boolean;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  /** Called with the canonical URL after a successful save. */
  onSaved: (url: string) => void;
}

export function GithubRepoPrompt({ open, projectId, onOpenChange, onSaved }: Props) {
  const handleSubmit = async (value: string): Promise<string | null> => {
    const parsed = parseGithubRepoUrl(value);
    if (!parsed) return "Enter a full GitHub repo URL.";

    // Best-effort verification via public API. Private repos 404 anonymously,
    // so a 404 isn't fatal — the edge function (authenticated) is the source of truth.
    try {
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (res.status === 200) {
        // public repo confirmed
      } else if (res.status !== 404) {
        // 403 (rate limit) or 5xx — continue and let server validate later
      }
    } catch {
      // network failure — continue
    }

    const canonicalUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
    const { error } = await supabase
      .from("projects")
      .update({
        github_repo_url: canonicalUrl,
        github_owner: parsed.owner,
        github_repo: parsed.repo,
      })
      .eq("id", projectId);

    if (error) return error.message;
    onSaved(canonicalUrl);
    onOpenChange(false);
    return null;
  };

  return (
    <GithubLinkDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Link a GitHub repo"
      description="Tickets in this project will be mirrored as GitHub issues in this repo. Assignees with a linked GitHub username will be added to the issue."
      inputLabel="GitHub repo URL"
      inputPlaceholder="https://github.com/owner/repo"
      helperText="Paste the full URL — we'll create issues here."
      validate={(v) =>
        parseGithubRepoUrl(v)
          ? null
          : "Must be a URL like https://github.com/owner/repo"
      }
      onSubmit={handleSubmit}
    />
  );
}
