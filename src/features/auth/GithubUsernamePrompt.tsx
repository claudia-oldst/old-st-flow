import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { GithubLinkDialog } from "./GithubLinkDialog";

const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export function GithubUsernamePrompt() {
  const user = useCurrentUser((s) => s.user);
  const setUser = useCurrentUser((s) => s.setUser);

  const open = !!user && !user.github_username;

  const handleSubmit = async (value: string): Promise<string | null> => {
    if (!user) return "Not signed in";

    let canonical = value;
    try {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(value)}`,
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (res.status === 404) return "No GitHub user with that username.";
      if (!res.ok) return "Couldn't reach GitHub, please try again.";
      const data = (await res.json()) as { login?: string };
      if (data.login) canonical = data.login;
    } catch {
      return "Couldn't reach GitHub, please try again.";
    }

    const { data: updated, error: dbError } = await supabase
      .from("team_members")
      .update({ github_username: canonical })
      .eq("id", user.id)
      .select("*")
      .single();

    if (dbError) {
      if (dbError.code === "23505") {
        return "That GitHub account is already linked to another team member.";
      }
      return dbError.message;
    }

    if (updated) setUser(updated);
    return null;
  };

  return (
    <GithubLinkDialog
      open={open}
      dismissible={false}
      title="Link your GitHub account"
      description="We'll use this to assign you to GitHub issues when tickets are assigned to you. You only need to do this once."
      inputLabel="GitHub username"
      inputPlaceholder="octocat"
      helperText="We'll verify it exists on GitHub before saving."
      maxLength={39}
      validate={(v) =>
        GITHUB_USERNAME_RE.test(v)
          ? null
          : "That doesn't look like a valid GitHub username."
      }
      onSubmit={handleSubmit}
    />
  );
}
