import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Github, Loader2 } from "lucide-react";

const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export function GithubUsernamePrompt() {
  const user = useCurrentUser((s) => s.user);
  const setUser = useCurrentUser((s) => s.setUser);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = !!user && !user.github_username;

  const handleSave = async () => {
    if (!user) return;
    const trimmed = value.trim();
    if (!GITHUB_USERNAME_RE.test(trimmed)) {
      setError("That doesn't look like a valid GitHub username.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Verify with GitHub's public users API
      let canonical = trimmed;
      try {
        const res = await fetch(
          `https://api.github.com/users/${encodeURIComponent(trimmed)}`,
          { headers: { Accept: "application/vnd.github+json" } },
        );
        if (res.status === 404) {
          setError("No GitHub user with that username.");
          setBusy(false);
          return;
        }
        if (!res.ok) {
          setError("Couldn't reach GitHub, please try again.");
          setBusy(false);
          return;
        }
        const data = (await res.json()) as { login?: string };
        if (data.login) canonical = data.login;
      } catch {
        setError("Couldn't reach GitHub, please try again.");
        setBusy(false);
        return;
      }

      const { data: updated, error: dbError } = await supabase
        .from("team_members")
        .update({ github_username: canonical })
        .eq("id", user.id)
        .select("*")
        .single();

      if (dbError) {
        if (dbError.code === "23505") {
          setError("That GitHub account is already linked to another team member.");
        } else {
          setError(dbError.message);
        }
        setBusy(false);
        return;
      }

      if (updated) setUser(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="glass-strong sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-accent" />
            <DialogTitle>Link your GitHub account</DialogTitle>
          </div>
          <DialogDescription>
            We'll use this to assign you to GitHub issues when tickets are
            assigned to you. You only need to do this once.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void handleSave();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="gh-username">GitHub username</Label>
            <Input
              id="gh-username"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="octocat"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              disabled={busy}
              maxLength={39}
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <p className="text-xs text-dim">
                We'll verify it exists on GitHub before saving.
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={busy || !value.trim()}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
