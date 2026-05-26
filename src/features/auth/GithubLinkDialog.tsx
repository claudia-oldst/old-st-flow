import { useState } from "react";
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

export interface GithubLinkDialogProps {
  open: boolean;
  title: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  helperText?: string;
  /** Allow user to dismiss the dialog. First-login prompt sets this false. */
  dismissible?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Sync validation. Return error message or null. */
  validate: (value: string) => string | null;
  /**
   * Async verification + save. Return error string to display, or null on success.
   * If success, the dialog will close (when dismissible).
   */
  onSubmit: (value: string) => Promise<string | null>;
  maxLength?: number;
}

export function GithubLinkDialog({
  open,
  title,
  description,
  inputLabel,
  inputPlaceholder,
  helperText,
  dismissible = true,
  onOpenChange,
  validate,
  onSubmit,
  maxLength,
}: GithubLinkDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    const validationError = validate(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const err = await onSubmit(trimmed);
      if (err) {
        setError(err);
      } else {
        setValue("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={dismissible ? onOpenChange : undefined}>
      <DialogContent
        className="glass-strong sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => !dismissible && e.preventDefault()}
        onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
        onInteractOutside={(e) => !dismissible && e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-accent" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void handleSubmit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="gh-link-input">{inputLabel}</Label>
            <Input
              id="gh-link-input"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={inputPlaceholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              disabled={busy}
              maxLength={maxLength}
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : helperText ? (
              <p className="text-xs text-dim">{helperText}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {dismissible && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => onOpenChange?.(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={busy || !value.trim()}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
