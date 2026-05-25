import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { Button } from "@/components/ui/button";
import oldStLogo from "@/assets/oldst-logo.png";

export default function Login() {
  const navigate = useNavigate();
  const user = useCurrentUser((s) => s.user);
  const authLoading = useCurrentUser((s) => s.authLoading);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-dim text-sm">
        Loading…
      </div>
    );
  }

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { hd: "old.st", prompt: "select_account" },
      },
    });
    if (error) setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl hairline bg-surface-2/40 backdrop-blur-xl p-8 flex flex-col items-center gap-6">
        <img src={oldStLogo} alt="Old St Labs" className="h-9 w-auto" />
        <div className="text-center space-y-1.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="text-sm text-dim">
            Use your <span className="text-foreground">@old.st</span> Google account.
          </p>
        </div>
        <Button
          onClick={signIn}
          disabled={loading}
          variant="default"
          className="w-full"
        >
          {loading ? "Redirecting…" : "Continue with Google"}
        </Button>
        <p className="text-[11px] text-dimmer text-center leading-relaxed">
          Access is granted by a PMBA in Admin → Team members.
        </p>
      </div>
    </div>
  );
}
