import { Github } from "lucide-react";
import { useProjectRepoUrl } from "./useProjectRepoUrl";

interface Props {
  projectId: string;
  issueNumber: number | null | undefined;
  size?: "xs" | "sm";
}

export function GithubIssueBadge({ projectId, issueNumber, size = "xs" }: Props) {
  const repoUrl = useProjectRepoUrl(projectId);
  if (!issueNumber || !repoUrl) return null;

  const cls =
    size === "sm"
      ? "text-xs gap-1"
      : "text-[10px] gap-1";

  return (
    <a
      href={`${repoUrl}/issues/${issueNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center font-mono text-dimmer hover:text-foreground transition ${cls}`}
      title={`Open GitHub issue #${issueNumber}`}
    >
      <Github className="h-3 w-3" />
      <span>#{issueNumber}</span>
    </a>
  );
}
